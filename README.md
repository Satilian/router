# router

Lightweight client-side router for React with nested route matching, loaders, and SSR hydration props.

## Installation

```bash
pnpm add router react react-dom
```

Peer requirements:

- `react`
- `react-dom`

## Quick start

```tsx
import { Link, Outlet, RouterProvider } from 'router';
import type { RouteConfig } from 'router';

const routes: RouteConfig[] = [
  {
    path: '/',
    layout: (
      <div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/users/42">User 42</Link>
        </nav>
        <Outlet />
      </div>
    ),
    children: [
      { index: true, element: <div>Home page</div> },
      { path: 'users/:id', element: <div>User page</div> },
    ],
  },
];

export function App() {
  return <RouterProvider config={{ routes }} />;
}
```

## Route config

`RouteConfig` supports three shapes:

- Path + element: `{ path: string, element: ReactNode }`
- Index route: `{ index: true, element: ReactNode }`
- Path + children: `{ path: string, children: RouteConfig[] }`

Shared options:

- `layout?: ReactNode` for wrapping child output via `Outlet`
- `loader?: (ctx) => Promise<unknown> | unknown`
- `ssrCache?: boolean | SsrCacheConfig`

## Loaders

Route loaders receive:

- `pathname`
- `params`
- `query`
- values from optional `loaderContext`

Example:

```tsx
import { RouterProvider, useLoaderData } from 'router';

const routes = [
  {
    path: '/users/:id',
    element: <UserPage />,
    loader: async ({ params }) => {
      const res = await fetch(`/api/users/${params.id}`);
      return res.json();
    },
  },
];

function UserPage() {
  const user = useLoaderData<{ id: string; name: string }>();
  return <div>{user?.name}</div>;
}

export function App() {
  return <RouterProvider config={{ routes }} />;
}
```

You can also define a root loader in `config.loader`.

## SSR props

`RouterProvider` supports server-provided values:

- `pathname?: string`
- `query?: Record<string, unknown>`
- `initialState?: Record<string, unknown>`
- `matches?: Match[] | null`

Example:

```tsx
<RouterProvider
  pathname={ssrPathname}
  query={ssrQuery}
  initialState={ssrLoaderData}
  matches={ssrMatches}
  config={{ routes, loader, loaderContext }}
/>
```

## Known limitations and error semantics

- Loaders run sequentially by design.
- If any loader throws during navigation, the error is re-thrown and previous loader state is preserved.
- If route matching fails, router renders `404 Matches Not Found`.
- Query values are modeled as `Record<string, unknown>` and should be serialized/deserialized by app code as needed.

## API reference

Exports from the package root:

- `Link`
- `matchRoutes`
- `Navigate`
- `Outlet`
- `RouterProvider`
- `runLoaders`
- `RouterSuspense`
- `useLoaderData`
- `useParams`
- `useRouter`
- `useSearchParams`
- all public types from `types.ts`

## Development

```bash
pnpm install
pnpm run build
pnpm test
```
