import { expect, test } from '@rstest/core';
import { runLoaders } from './run-loaders';
import type { Match, RouteConfig } from './types';

const makeMatch = (
  route: RouteConfig,
  params: Record<string, string> = {},
): Match => ({ route, params });

test('updates loaderData on successful loaders', async () => {
  const loaderData = { current: { stale: true } as Record<string, unknown> };

  const matches: Match[] = [
    makeMatch(
      { path: '/users/:id', element: 'user', loader: (ctx) => ctx.params.id },
      {
        id: '7',
      },
    ),
  ];

  await runLoaders(matches, '/users/7', { page: '1' }, loaderData);

  expect(loaderData.current).toEqual({
    '/users/:id': '7',
  });
});

test('keeps previous loaderData when loader throws', async () => {
  const loaderData = {
    current: { '/users/:id': 'previous-value' } as Record<string, unknown>,
  };

  const matches: Match[] = [
    makeMatch({
      path: '/users/:id',
      element: 'user',
      loader: () => {
        throw new Error('boom');
      },
    }),
  ];

  await expect(runLoaders(matches, '/users/7', {}, loaderData)).rejects.toThrow(
    'boom',
  );

  expect(loaderData.current).toEqual({ '/users/:id': 'previous-value' });
});

test('runs root loader and route loader together', async () => {
  const loaderData = { current: {} as Record<string, unknown> };

  const matches: Match[] = [
    makeMatch(
      { path: '/users/:id', element: 'user', loader: (ctx) => ctx.params.id },
      {
        id: '9',
      },
    ),
  ];

  await runLoaders(
    matches,
    '/users/9',
    { q: 'abc' },
    loaderData,
    (ctx) => `${ctx.pathname}:${String(ctx.query.q)}`,
  );

  expect(loaderData.current).toEqual({
    __root__: '/users/9:abc',
    '/users/:id': '9',
  });
});
