import assert from 'node:assert/strict';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const directory = dirname(fileURLToPath(import.meta.url));
const output = resolve(root, 'node_modules/.cache/router-browser-results');
await mkdir(output, { recursive: true });
const require = createRequire(join(root, 'package.json'));
const rslibPackage = require.resolve('@rslib/core/package.json');
const build = await promisify(execFile)(
  process.execPath,
  [join(dirname(rslibPackage), 'bin/rslib.js')],
  { cwd: root },
);
console.log(build.stdout);
const rslibRequire = createRequire(require.resolve('@rslib/core'));
const rsbuildRequire = createRequire(rslibRequire.resolve('@rsbuild/core'));
const { rspack } = rsbuildRequire('@rspack/core');
const { chromium } = require(
  resolve(
    root,
    'node_modules/.cache/router-browser-tools/node_modules/playwright',
  ),
);

async function bundle(server) {
  const compiler = rspack({
    mode: 'development',
    context: root,
    target: server ? 'node' : 'web',
    entry: join(directory, server ? 'fixture.jsx' : 'mount.jsx'),
    output: {
      path: output,
      filename: server ? 'fixture.cjs' : 'app.js',
      ...(server ? { library: { type: 'commonjs2' } } : {}),
    },
    resolve: {
      extensions: ['.jsx', '.js'],
      alias: { '@satilian/router': resolve(root, 'dist/index.js') },
      modules: [resolve(root, 'node_modules'), 'node_modules'],
    },
    module: {
      rules: [
        {
          test: /\.jsx$/,
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: { syntax: 'ecmascript', jsx: true },
                  transform: { react: { runtime: 'automatic' } },
                },
              },
            },
          ],
        },
      ],
    },
    ...(server ? { externals: [/^react($|\/)/, /^react-dom($|\/)/] } : {}),
  });
  try {
    await new Promise((accept, reject) =>
      compiler.run((error, stats) => {
        if (error) reject(error);
        else if (stats.hasErrors())
          reject(new Error(stats.toString({ all: false, errors: true })));
        else accept();
      }),
    );
  } finally {
    await new Promise((accept, reject) =>
      compiler.close((error) => (error ? reject(error) : accept())),
    );
  }
}

await bundle(false);
await bundle(true);
const React = require('react');
const { renderToString } = require('react-dom/server');
const { App } = require(join(output, 'fixture.cjs'));
const hydrationMarkup = renderToString(
  React.createElement(App, { hydrate: true }),
);
const gates = new Set();
function releaseGates() {
  for (const response of gates) response.end('ready');
  gates.clear();
}
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/gate') {
      gates.add(response);
      response.on('close', () => gates.delete(response));
      return;
    }
    if (url.pathname === '/app.js') {
      response.setHeader('Content-Type', 'application/javascript');
      response.end(await readFile(join(output, 'app.js')));
      return;
    }
    if (url.pathname === '/download') {
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="router-check.txt"',
      );
      response.end('router check');
      return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    const hydrate = url.searchParams.has('hydrate');
    response.end(
      '<!doctype html><html><head><title>Router browser check</title></head><body><div id="root">' +
        (hydrate ? hydrationMarkup : '') +
        '</div><script>window.__hydrate=' +
        hydrate +
        '</script><script src="/app.js"></script></body></html>',
    );
  } catch (error) {
    response.statusCode = 500;
    response.end(String(error));
  }
});
await new Promise((accept) => server.listen(0, '127.0.0.1', accept));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const results = [];
const errors = [];
let browserVersion;
try {
  browser = await chromium.launch({
    channel: process.env.ROUTER_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
  });
  browserVersion = browser.version();
  console.log('Browser:', browserVersion);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.setDefaultTimeout(10000);
  const snapshot = async () =>
    JSON.parse(await page.getByTestId('snapshot').textContent());
  const idleAt = async (path) => {
    await page.waitForFunction((expected) => {
      const node = document.querySelector('[data-testid="snapshot"]');
      return (
        document.querySelector('[data-testid="status"]')?.textContent ===
          'idle' &&
        node &&
        JSON.parse(node.textContent).pathname === expected
      );
    }, path);
    assert.equal(new URL(page.url()).pathname, path);
  };
  const home = async () => {
    releaseGates();
    await page.goto(origin);
    await idleAt('/');
  };
  async function scenario(name, body) {
    try {
      await body();
      results.push({ name, status: 'pass' });
      console.log('PASS', name);
    } catch (error) {
      results.push({ name, status: 'fail', error: String(error) });
      console.error('FAIL', name, error);
      await page.screenshot({
        path: join(output, 'failure-' + results.length + '.png'),
      });
    }
  }
  await scenario('initial loaders in StrictMode', async () => {
    await home();
    assert.equal((await snapshot()).data.home.name, 'home');
  });
  await scenario('static wins over dynamic declared first', async () => {
    await home();
    await page.getByRole('link', { name: 'Static', exact: true }).click();
    await idleAt('/users/new');
    assert.equal((await snapshot()).data.static.name, 'static');
  });
  await scenario('parent params reach nested loader', async () => {
    await home();
    await page.getByRole('link', { name: 'Nested', exact: true }).click();
    await idleAt('/team/42/details/7');
    assert.deepEqual((await snapshot()).data.details.params, {
      team: '42',
      detail: '7',
    });
  });
  await scenario('query updates URL and loader context', async () => {
    await home();
    await page.getByRole('button', { name: 'Query', exact: true }).click();
    await page.waitForURL('**/?page=2');
    await idleAt('/');
    assert.equal((await snapshot()).data.home.query.page, '2');
  });
  await scenario('pending keeps URL/data and component state', async () => {
    await home();
    await page.getByRole('button', { name: 'Count 0', exact: true }).click();
    await page.getByRole('link', { name: 'Slow', exact: true }).click();
    await page.getByTestId('pending').waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal((await snapshot()).data.home.name, 'home');
    releaseGates();
    await idleAt('/slow');
    await page.getByRole('button', { name: 'Count 1', exact: true }).waitFor();
  });
  await scenario('last navigation wins and aborts slow fetch', async () => {
    await home();
    await page
      .getByRole('button', { name: 'Programmatic slow', exact: true })
      .click();
    await page.getByTestId('pending').waitFor();
    await page.getByRole('link', { name: 'Fast', exact: true }).click();
    await idleAt('/fast');
    releaseGates();
    assert.equal((await snapshot()).data.fast.name, 'fast');
    assert.equal((await snapshot()).data.slow, undefined);
  });
  await scenario(
    'stale loader ignoring AbortSignal cannot publish',
    async () => {
      await home();
      const request = page.waitForRequest('**/gate');
      await page.getByRole('link', { name: 'Stubborn', exact: true }).click();
      await request;
      await page.getByRole('link', { name: 'Fast', exact: true }).click();
      await idleAt('/fast');
      releaseGates();
      await page.waitForFunction(() => window.__stubbornFinished === true);
      await idleAt('/fast');
      assert.equal((await snapshot()).data.stubborn, undefined);
    },
  );
  await scenario('back and forward load matching data', async () => {
    await home();
    await page.getByRole('link', { name: 'Fast', exact: true }).click();
    await idleAt('/fast');
    await page.goBack();
    await idleAt('/');
    assert.equal((await snapshot()).data.home.name, 'home');
    await page.goForward();
    await idleAt('/fast');
    assert.equal((await snapshot()).data.fast.name, 'fast');
  });
  await scenario('replace does not add history entry', async () => {
    await home();
    const length = await page.evaluate(() => history.length);
    await page
      .getByRole('button', { name: 'Replace fast', exact: true })
      .click();
    await idleAt('/fast');
    assert.equal(await page.evaluate(() => history.length), length);
  });
  await scenario(
    'loader error preserves programmatic URL/data and recovers',
    async () => {
      await home();
      await page.getByRole('link', { name: 'Fail', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
      const failed = JSON.parse(
        await page.getByTestId('failed-snapshot').textContent(),
      );
      assert.equal(failed.data.home.name, 'home');
      await page.getByRole('button', { name: 'Recover' }).click();
      await idleAt('/');
    },
  );
  await scenario(
    'history loader failure shows target without stale data',
    async () => {
      await home();
      await page.evaluate(() => {
        history.pushState({}, '', '/fail');
        history.pushState({}, '', '/fast');
      });
      await page.goBack();
      await page.getByRole('alert').waitFor();
      assert.equal(new URL(page.url()).pathname, '/fail');
      const failed = JSON.parse(
        await page.getByTestId('failed-snapshot').textContent(),
      );
      assert.equal(failed.pathname, '/fail');
      assert.deepEqual(failed.data, {});
      await page.getByRole('button', { name: 'Recover' }).click();
      await idleAt('/');
    },
  );
  await scenario('Navigate redirects without unhandled rejection', async () => {
    await home();
    await page.getByRole('link', { name: 'Redirect', exact: true }).click();
    await idleAt('/fast');
  });
  await scenario('preventDefault preserves current route', async () => {
    await home();
    await page.getByRole('link', { name: 'Prevented', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal((await snapshot()).pathname, '/');
  });
  await scenario('target blank opens native tab', async () => {
    await home();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'New tab', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForURL('**/fast');
    assert.equal(new URL(page.url()).pathname, '/');
    await popup.close();
  });
  await scenario('download keeps native anchor behavior', async () => {
    await home();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download', exact: true }).click();
    assert.equal(
      (await downloadPromise).suggestedFilename(),
      'router-check.txt',
    );
    assert.equal(new URL(page.url()).pathname, '/');
  });
  await scenario('external anchor remains native', async () => {
    await home();
    await context.route('https://example.invalid/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<h1>External destination</h1>',
      }),
    );
    await page.getByRole('link', { name: 'External', exact: true }).click();
    await page.waitForURL('https://example.invalid/');
    await page.getByRole('heading', { name: 'External destination' }).waitFor();
  });
  await scenario('real SSR hydration preserves server data', async () => {
    await page.goto(origin + '/?hydrate=1');
    await idleAt('/');
    assert.equal((await snapshot()).data.home.name, 'server-seed');
    await page.getByRole('button', { name: 'Count 0', exact: true }).click();
    await page.getByRole('button', { name: 'Count 1', exact: true }).waitFor();
  });
  await scenario('404 renders', async () => {
    await page.goto(origin + '/missing');
    await page.getByText('404 Matches Not Found', { exact: true }).waitFor();
  });
  await scenario('no browser exceptions or unhandled rejections', async () => {
    assert.deepEqual(await page.evaluate(() => window.__unhandled ?? []), []);
    assert.deepEqual(errors, []);
  });
  await page.goto(origin);
  await idleAt('/');
  await page.screenshot({ path: join(output, 'router.png'), fullPage: true });
  await context.tracing.stop({ path: join(output, 'trace.zip') });
  await context.close();
} finally {
  releaseGates();
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((accept) => server.close(accept));
  await writeFile(
    join(output, 'report.json'),
    JSON.stringify(
      {
        browser: browserVersion,
        passed: results.filter((item) => item.status === 'pass').length,
        failed: results.filter((item) => item.status === 'fail').length,
        results,
        errors,
      },
      null,
      2,
    ),
  );
}
console.log('Report:', join(output, 'report.json'));
if (results.some((result) => result.status === 'fail')) process.exitCode = 1;
