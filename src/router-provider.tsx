import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { matchRoutes } from './match-routes';
import { renderMatches } from './render-matches';
import { runLoaders } from './run-loaders';
import type {
  Match,
  NavigateOptions,
  RouterContextType,
  RouterProviderProps,
} from './types';

const RouterContext = createContext<RouterContextType | null>(null);

export const RouterProvider = memo(
  function RouterProvider({
    pathname: initialPath,
    matches: initialMatches,
    query: initialQuery,
    initialState = {},
    config,
  }: RouterProviderProps) {
    const { routes, loader: rootLoader } = config;

    const [, forceRender] = useState(0);

    const pathnameRef = useRef(
      initialPath ||
        (typeof window !== 'undefined' ? window.location.pathname : '/'),
    );

    const loaderDataRef = useRef<Record<string, unknown>>(initialState);
    const loaderData = loaderDataRef.current;

    const matchesRef = useRef<Match[] | null>(initialMatches);
    const matches =
      matchesRef.current || matchRoutes(routes, pathnameRef.current);

    const queryRef = useRef<Record<string, unknown>>(
      initialQuery ||
        Object.fromEntries(
          new URLSearchParams(
            typeof window !== 'undefined' ? window.location.search : '',
          ).entries(),
        ),
    );
    const query = queryRef.current;

    const params = useMemo(
      () => matches?.reduce((acc, m) => ({ ...acc, ...m.params }), {}) || {},
      [matches],
    );

    const navigate = useCallback(
      async (nextPathname: string, options?: NavigateOptions) => {
        if (typeof window === 'undefined') return;

        const url = new URL(nextPathname, window.location.origin);
        const pathnamePart = url.pathname;
        const hash = url.hash.slice(1); // strip leading '#'

        if (!options?.shallow) {
          if (options?.replace)
            window.history.replaceState({}, '', nextPathname);
          else window.history.pushState({}, '', nextPathname);
        }

        // If pathname changed: match routes and run loaders
        if (pathnameRef.current !== pathnamePart) {
          matchesRef.current = matchRoutes(routes, pathnamePart);
          const nextQuery = Object.fromEntries(url.searchParams.entries());
          try {
            await runLoaders(
              matchesRef.current,
              pathnamePart,
              nextQuery,
              loaderDataRef,
              rootLoader,
            );
          } catch (e) {
            console.error('❌ [RouterProvider] navigate: loader failed', e);
            throw e;
          }
          pathnameRef.current = pathnamePart;
        }

        forceRender((v) => v + 1);

        // Прокрутка страницы (по умолчанию true, если не указано иное)
        if (options?.scrollToTop !== false) {
          if (hash)
            document
              .getElementById(hash)
              ?.scrollIntoView({ behavior: 'smooth' });
          else window.scrollTo(0, 0);
        }
      },
      [routes, rootLoader],
    );

    const setQuery = (
      newQuery: Record<string, unknown>,
      options?: NavigateOptions,
    ) => {
      if (typeof window === 'undefined') return;

      queryRef.current = { ...query, ...newQuery };
      const searchParams = new URLSearchParams(
        queryRef.current as Record<string, string>,
      ).toString();
      const nextPath = `${pathnameRef.current}?${searchParams}`;

      navigate(nextPath, options);
    };

    const back = () => {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    };

    // Обработчик для кнопок "Назад" и "Вперед" в браузере
    useEffect(() => {
      const handler = () => {
        const fullPath =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        navigate(fullPath, { shallow: true });
      };

      window.addEventListener('popstate', handler);

      return () => window.removeEventListener('popstate', handler);
    }, [navigate]);

    if (!matches) return <div>404 Matches Not Found</div>;

    return (
      <RouterContext.Provider
        value={{
          matches,
          navigate,
          pathname: pathnameRef.current,
          loaderData,
          params,
          back,
          query,
          setQuery,
        }}
      >
        {renderMatches(matches)}
      </RouterContext.Provider>
    );
  },
  () => false,
);

export const useRouter = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
};

export const useLoaderData = <T,>(path?: string): T | undefined => {
  const { matches, loaderData } = useRouter();
  let prevMath;
  let match;
  if (path)
    matches?.find((m, i) => {
      if (m.route.path === path) {
        match = m;
        prevMath = matches[i - 1];
        return true;
      }
      return false;
    });
  else {
    match = matches?.[matches.length - 1];
    prevMath = matches?.[matches.length - 2];
  }

  if (!match) return undefined;

  // Index routes always have a parent with path due to type constraints.
  // prevMath?.route.path is safe to access for index routes
  const key = match.route.path || `${prevMath?.route.path || ''}index`;

  return (loaderData as Record<string, unknown>)[key] as T;
};

export const useParams = (): Record<string, string> => {
  const { params } = useRouter();
  return params;
};

export const useSearchParams = () => {
  const { query, setQuery } = useRouter();
  return [query, setQuery] as const;
};
