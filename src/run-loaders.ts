import { LoaderCtx, Match } from './types';

export const runLoaders = async (
  matches: Match[] | null,
  pathname: string,
  query: Record<string, unknown>,
  loaderData: { current: Record<string, unknown> } = { current: {} },
  rootLoader?: (ctx: LoaderCtx) => Promise<unknown> | unknown,
) => {
  if (!matches && !rootLoader) return;

  const newData: Record<string, unknown> = {};

  // Загружаем корневой loader если он есть
  if (rootLoader) {
    newData['__root__'] = await rootLoader({ pathname, params: {}, query });
  }

  // Загружаем loaders для каждого маршрута
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
      });
    }
  }

  loaderData.current = newData;
};
