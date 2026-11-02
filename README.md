# router

Lightweight client-side router for React with nested route matching, loaders, and SSR hydration props.

## Installation

```bash
pnpm add @satilian/router react react-dom
```

Peer requirements:

- `react`
- `react-dom`

## Quick start

```tsx
import { Link, Outlet, RouterProvider } from '@satilian/router';
import type { RouteConfig } from '@satilian/router';

const routes: RouteConfig[] = [
  {
    id: "route-1", path: '/',
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
      { id: "route-2", index: true, element: <div>Home page</div> },
      { id: "route-3", path: 'users/:id', element: <div>User page</div> },
    ],
  },
];

export function App() {
  return <RouterProvider config={{ routes }} />;
}
```

## Route config

`RouteConfig` supports three shapes:

- Path + element: `{ id: "route-4", path: string, element: ReactNode }`
- Index route: `{ id: "route-5", index: true, element: ReactNode }`
- Path + children: `{ id: "route-6", path: string, children: RouteConfig[] }`

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
import { RouterProvider, useLoaderData } from '@satilian/router';

const routes = [
  {
    id: "route-7", path: '/users/:id',
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
- If a programmatic navigation loader throws, the error is re-thrown and the previous URL and data are preserved. History traversal errors show the target error state.
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

## Migration to 2.0

Every route requires a unique `id` (`__root__` is reserved). Loader data and SSR `initialState` are keyed by ID; `useLoaderData(id)` now takes an ID instead of a path. Migrate server and client together.

Loaders run sequentially and receive accumulated parent params and an optional AbortSignal. A newer navigation cancels the previous one. Programmatic navigation commits history after loading succeeds. Errors are exposed through `useNavigation()` and `errorFallback`; `navigate` and `setQuery` reject on failure.

Without initialState the client runs loaders on mount. Pass initialState for hydration to avoid reloading. RouterSuspense must be inside RouterProvider, typically in a layout, and keeps its children mounted while loading. `ssrCache` is metadata for external integrations; this package does not implement a server cache.
