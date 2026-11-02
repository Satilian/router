import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { matchRoutes } from './match-routes';
import { OutletProvider } from './outlet';
import { renderMatches } from './render-matches';
import { runLoaders } from './run-loaders';
import type {
  NavigateOptions,
  RouterContextType,
  RouterProviderProps,
  RouteConfig,
} from './types';

export type NavigationState = {
  status: 'idle' | 'loading' | 'error';
  target?: string;
  error?: unknown;
};
const NavigationContext = createContext<NavigationState>({ status: 'idle' });
const RouterContext = createContext<RouterContextType | null>(null);
export const useNavigation = (): NavigationState =>
  useContext(NavigationContext);

export function RouterProvider({
  pathname,
  matches,
  query,
  initialState,
  config,
  errorFallback,
}: RouterProviderProps) {
  useMemo(() => {
    const ids = new Set<string>(['__root__']);
    function validate(routes: RouteConfig[]) {
      for (const route of routes) {
        if (!route.id || ids.has(route.id))
          throw new Error('Route IDs must be unique and cannot be __root__');
        ids.add(route.id);
        if (route.children) validate(route.children);
      }
    }
    validate(config.routes);
  }, [config.routes]);
  const [snapshot, setSnapshot] = useState(() => {
    const path =
      pathname ??
      (typeof window === 'undefined' ? '/' : window.location.pathname);
    return {
      pathname: path,
      matches: matches ?? matchRoutes(config.routes, path),
      query:
        query ??
        Object.fromEntries(
          new URLSearchParams(
            typeof window === 'undefined' ? '' : window.location.search,
          ),
        ),
      hash: typeof window === 'undefined' ? '' : window.location.hash,
      loaderData: initialState ?? {},
    };
  });
  const current = useRef(snapshot);
  const active = useRef<AbortController | null>(null);
  const [navigation, setNavigation] = useState<NavigationState>({
    status: 'idle',
  });
  const navigate = useCallback(
    async (to: string, options?: NavigateOptions): Promise<void> => {
      if (typeof window === 'undefined') return;
      const url = new URL(to, window.location.href);
      if (url.origin !== window.location.origin) {
        if (options?.replace) window.location.replace(url.href);
        else window.location.assign(url.href);
        return;
      }
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      setNavigation({ status: 'loading', target: url.href });
      const nextMatches = matchRoutes(config.routes, url.pathname);
      const nextQuery = Object.fromEntries(url.searchParams);
      const data = { current: current.current.loaderData };
      try {
        await runLoaders(
          nextMatches,
          url.pathname,
          nextQuery,
          data,
          config.loader,
          config.loaderContext,
          controller.signal,
        );
        if (active.current !== controller || controller.signal.aborted) return;
        if (!options?.shallow)
          window.history[options?.replace ? 'replaceState' : 'pushState'](
            {},
            '',
            url.href,
          );
        const next = {
          pathname: url.pathname,
          matches: nextMatches,
          query: nextQuery,
          hash: url.hash,
          loaderData: data.current,
        };
        current.current = next;
        setSnapshot(next);
        setNavigation({ status: 'idle' });
        if (options?.scrollToTop !== false) {
          if (url.hash)
            document.getElementById(url.hash.slice(1))?.scrollIntoView();
          else window.scrollTo(0, 0);
        }
      } catch (error) {
        if (controller.signal.aborted || active.current !== controller) return;
        if (options?.shallow) {
          const next = {
            pathname: url.pathname,
            matches: nextMatches,
            query: nextQuery,
            hash: url.hash,
            loaderData: {},
          };
          current.current = next;
          setSnapshot(next);
        }
        setNavigation({ status: 'error', target: url.href, error });
        throw error;
      }
    },
    [config.routes, config.loader, config.loaderContext],
  );
  useEffect(() => {
    const handler = () => {
      void navigate(window.location.href, { shallow: true }).catch(() => {
        /* Error is exposed through navigation state. */
      });
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [navigate]);
  const initialized = useRef(initialState !== undefined);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void navigate(window.location.href, {
        shallow: true,
        scrollToTop: false,
      }).catch(() => {
        /* Error is exposed through navigation state. */
      });
    }
    return () => {
      active.current?.abort();
      if (initialState === undefined) initialized.current = false;
    };
  }, [navigate, initialState]);
  const params = Object.assign(
    {},
    ...(snapshot.matches ?? []).map((match) => match.params),
  ) as Record<string, string>;
  const setQuery: RouterContextType['setQuery'] = (value, options) => {
    const search = new URLSearchParams(
      Object.entries(value).map(([key, item]) => [key, String(item)]),
    ).toString();
    return navigate(
      current.current.pathname +
        (search ? '?' + search : '') +
        current.current.hash,
      options,
    );
  };
  const rendered = snapshot.matches ? (
    renderMatches(snapshot.matches)
  ) : (
    <div>404 Matches Not Found</div>
  );
  const content =
    navigation.status === 'error' ? (
      (errorFallback?.(navigation.error) ?? (
        <div role="alert">Navigation failed</div>
      ))
    ) : isValidElement(config.layout) ? (
      <OutletProvider value={rendered}>{config.layout}</OutletProvider>
    ) : (
      rendered
    );
  return (
    <NavigationContext.Provider value={navigation}>
      <RouterContext.Provider
        value={{
          ...snapshot,
          params,
          navigate,
          setQuery,
          back: () => window.history.back(),
        }}
      >
        {content}
      </RouterContext.Provider>
    </NavigationContext.Provider>
  );
}

export function useRouter(): RouterContextType {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useRouter must be used inside RouterProvider');
  return context;
}
export function useLoaderData<T>(id?: string): T | undefined {
  const { matches, loaderData } = useRouter();
  const key = id ?? matches?.[matches.length - 1]?.route.id;
  return key === undefined ? undefined : (loaderData[key] as T | undefined);
}
export const useParams = (): Record<string, string> => useRouter().params;
export const useSearchParams = () => {
  const { query, setQuery } = useRouter();
  return [query, setQuery] as const;
};
