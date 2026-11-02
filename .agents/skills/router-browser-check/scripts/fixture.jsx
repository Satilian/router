import React, { StrictMode, useState } from 'react';
import {
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  RouterSuspense,
  useLoaderData,
  useNavigation,
  useRouter,
} from '@satilian/router';

function Page() {
  const data = useLoaderData();
  return <output data-testid="page">{JSON.stringify(data ?? null)}</output>;
}

function Stage() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>
      <Outlet />
    </>
  );
}

function Layout() {
  const router = useRouter();
  const navigation = useNavigation();
  return (
    <main>
      <h1>Router browser check</h1>
      <nav>
        <Link to="/">Home</Link> <Link to="/slow">Slow</Link>{' '}
        <Link to="/fast">Fast</Link> <Link to="/stubborn">Stubborn</Link>{' '}
        <Link to="/fail">Fail</Link> <Link to="/users/new">Static</Link>{' '}
        <Link to="/team/42/details/7">Nested</Link>{' '}
        <Link to="/redirect">Redirect</Link>{' '}
        <Link to="/fast" onClick={(event) => event.preventDefault()}>
          Prevented
        </Link>{' '}
        <Link to="/fast" target="_blank">
          New tab
        </Link>{' '}
        <Link to="/download" download>
          Download
        </Link>{' '}
        <Link to="https://example.invalid/">External</Link>
      </nav>
      <button
        onClick={() => {
          void router.setQuery({ page: '2' }).catch(() => {});
        }}
      >
        Query
      </button>
      <button
        onClick={() => {
          void router.navigate('/slow').catch(() => {});
        }}
      >
        Programmatic slow
      </button>
      <button
        onClick={() => {
          void router.navigate('/fast', { replace: true }).catch(() => {});
        }}
      >
        Replace fast
      </button>
      <output data-testid="status">{navigation.status}</output>
      <output data-testid="snapshot">
        {JSON.stringify({
          pathname: router.pathname,
          query: router.query,
          params: router.params,
          data: router.loaderData,
        })}
      </output>
      <RouterSuspense fallback={<p data-testid="pending">Loading</p>}>
        <Stage />
      </RouterSuspense>
    </main>
  );
}

function Failure({ error }) {
  const { navigate, pathname, loaderData } = useRouter();
  return (
    <section role="alert">
      {String(error?.message ?? error)}
      <output data-testid="failed-snapshot">
        {JSON.stringify({ pathname, data: loaderData })}
      </output>
      <button
        onClick={() => {
          void navigate('/').catch(() => {});
        }}
      >
        Recover
      </button>
    </section>
  );
}

const loader =
  (name) =>
  async ({ params, query, signal }) => {
    if (name === 'slow') await fetch('/gate', { signal });
    if (name === 'stubborn') {
      await fetch('/gate');
      window.__stubbornFinished = true;
    }
    if (name === 'fail') throw new Error('Expected loader failure');
    return { name, params, query };
  };
const routes = [
  { id: 'home', path: '/', element: <Page />, loader: loader('home') },
  { id: 'slow', path: '/slow', element: <Page />, loader: loader('slow') },
  { id: 'fast', path: '/fast', element: <Page />, loader: loader('fast') },
  {
    id: 'stubborn',
    path: '/stubborn',
    element: <Page />,
    loader: loader('stubborn'),
  },
  { id: 'fail', path: '/fail', element: <Page />, loader: loader('fail') },
  {
    id: 'dynamic',
    path: '/users/:id',
    element: <Page />,
    loader: loader('dynamic'),
  },
  {
    id: 'static',
    path: '/users/new',
    element: <Page />,
    loader: loader('static'),
  },
  {
    id: 'team',
    path: '/team/:team',
    loader: loader('team'),
    children: [
      {
        id: 'details',
        path: 'details/:detail',
        element: <Page />,
        loader: loader('details'),
      },
    ],
  },
  {
    id: 'redirect',
    path: '/redirect',
    element: <Navigate to="/fast" replace />,
  },
];
const config = { routes, layout: <Layout /> };
const seeded = { home: { name: 'server-seed', params: {}, query: {} } };
export function App({ hydrate = false }) {
  return (
    <StrictMode>
      <RouterProvider
        config={config}
        query={hydrate ? { hydrate: '1' } : undefined}
        initialState={hydrate ? seeded : undefined}
        errorFallback={(error) => <Failure error={error} />}
      />
    </StrictMode>
  );
}
