import { LoaderCtx, Match } from './types';

export const runLoaders = async <C extends Record<string, unknown>>(
  matches: Match[] | null,
  pathname: string,
  query: Record<string, unknown>,
  loaderData: { current: Record<string, unknown> } = { current: {} },
  rootLoader?: (ctx: LoaderCtx<C>) => Promise<unknown> | unknown,
  context: C = {} as C,
) => {
  if (!matches && !rootLoader) return;

  const newData: Record<string, unknown> = {};

  // Загружаем корневой loader если он есть
  if (rootLoader) {
    newData['__root__'] = await rootLoader({
      pathname,
      params: {},
      query,
      ...context,
    });
  }

  // Loaders run sequentially — intentional: later loaders may depend on results
  // of earlier ones (e.g. a child route loader reading parent loader data).
  // On loader error: the exception propagates to the caller; loaderData.current
  // is NOT updated, so the previous state is preserved until a successful navigation.
  for (let i = 0; i < (matches?.length || 0); i++) {
    const match = matches![i];
    // Note: index routes (index: true) always have a parent with path due to type constraints
    // (RouteIndexElement can only exist as leaf nodes, parents with children must have path).
    // So accessing matches[i - 1].route.path is always safe when match.route.path is undefined
    const key = match.route.path || `${matches![i - 1].route.path}index`;

    if (match.route.loader) {
      newData[key] = await match.route.loader({
        pathname,
        params: match.params,
        query,
        ...context,
      });
    }
  }

  loaderData.current = newData;
};
