import type { LoaderCtx, Match } from './types';

export async function runLoaders(
  matches: Match[] | null,
  pathname: string,
  query: Record<string, unknown>,
  loaderData: { current: Record<string, unknown> } = { current: {} },
  rootLoader?: (ctx: LoaderCtx) => Promise<unknown> | unknown,
  context: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<void> {
  const data: Record<string, unknown> = {};
  const params: Record<string, string> = {};
  const ctx = (): LoaderCtx => ({
    ...context,
    pathname,
    query,
    params: { ...params },
    signal,
  });
  signal?.throwIfAborted();
  if (rootLoader) data.__root__ = await rootLoader(ctx());
  for (const match of matches ?? []) {
    signal?.throwIfAborted();
    Object.assign(params, match.params);
    if (match.route.loader)
      data[match.route.id] = await match.route.loader(ctx());
  }
  signal?.throwIfAborted();
  loaderData.current = data;
}
