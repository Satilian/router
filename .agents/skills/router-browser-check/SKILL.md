---
name: router-browser-check
description: Run real browser verification of this router from Codex CLI using Playwright, including navigation, loader races, error handling, history and SSR hydration. Use when browser verification is requested; not for arbitrary browsing or unit-only changes.
---

# Router browser check

Run from the repository root. Use the scripts bundled with this skill, which exercise the freshly built public `dist/index.js` in a real headless browser. The runner rebuilds the library, bundles a minimal React consumer using the existing Rspack dependency, starts a loopback server on a free port, then closes its own server, browser and isolated profile. No desktop app or Browser extension is needed.

## Setup and run

Reuse `node_modules/.cache/router-browser-tools/node_modules/playwright` when present. If missing, install into this ignored directory without changing package manifests or lock files:

```powershell
npm install --prefix node_modules/.cache/router-browser-tools --no-save --package-lock=false playwright@1.64.1
```

The default browser is installed Google Chrome. For installed Edge, set `$env:ROUTER_BROWSER_CHANNEL = 'msedge'` for this command session. If neither browser is installed, report that prerequisite; do not silently download browsers or change machine settings. A browser installation requires authorization.

```powershell
node .agents/skills/router-browser-check/scripts/run.mjs
```

Run with ordinary permissions first. Windows sandbox may permit Node but block npm DNS or browser loopback requests (`ENOTFOUND`, `ERR_NETWORK_ACCESS_DENIED`). Request scoped approval for the affected installation or runner command when this happens. Do not change global sandbox settings, disable browser security or attach to the user's personal browser profile.

## Evidence

The runner checks 19 scenarios: initial loading under StrictMode, static route ranking, accumulated parent params, query changes, pending URL/data/state preservation, cancellable and non-cancellable loader races, back/forward, replace, programmatic and history errors with recovery, Navigate, prevented links, new tabs, downloads, external links, actual server-rendered hydration, 404 and console/unhandled errors. The external destination is fulfilled locally by Playwright; it does not contact that website.

Generated artifacts are in `node_modules/.cache/router-browser-results/`:

- `report.json`: browser version, scenario results and errors.
- `trace.zip`: Playwright trace for inspection.
- `router.png`: final page; `failure-*.png` capture scenario failures.

Read the current report and inspect screenshots when a scenario fails. Distinguish harness mistakes, environment restrictions and library defects before changing source. Do not suppress errors to obtain a passing report. Report exact passed/failed counts and browser version; this Chrome smoke check does not prove support for other browsers or React versions.

The fixture and runner are reusable browser-verification helpers, separate from the unit-test suite. Adapt their scenarios only for requested behavior changes. Run lint, typecheck and existing unit tests separately when source changes. Keep tooling and artifacts ignored, do not publish the skill in the npm package, and do not modify unrelated user changes.
