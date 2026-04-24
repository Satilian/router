import { expect, test } from '@rstest/core';
import { matchRoutes } from './match-routes';
import type { RouteConfig } from './types';

const routes: RouteConfig[] = [
  { path: '/users/new', element: 'new user page' },
  { path: '/users/:id', element: 'user details page' },
  {
    path: '/',
    children: [
      {
        path: 'dashboard',
        children: [
          { index: true, element: 'dashboard index' },
          { path: 'settings', element: 'dashboard settings' },
        ],
      },
    ],
  },
  { path: '*', element: 'fallback page' },
];

test('prefers static route over dynamic route', () => {
  const matches = matchRoutes(routes, '/users/new');

  expect(matches).not.toBeNull();
  expect(matches?.[0]?.route.path).toBe('/users/new');
});

test('matches dynamic route and extracts params', () => {
  const matches = matchRoutes(routes, '/users/42');

  expect(matches).not.toBeNull();
  expect(matches?.[0]?.route.path).toBe('/users/:id');
  expect(matches?.[0]?.params).toEqual({ id: '42' });
});

test('matches nested route with index child', () => {
  const matches = matchRoutes(routes, '/dashboard');

  expect(matches).not.toBeNull();
  expect(matches?.length).toBe(3);
  expect(matches?.[0]?.route.path).toBe('/');
  expect(matches?.[1]?.route.path).toBe('dashboard');
  expect(matches?.[2]?.route.index).toBe(true);
});

test('matches nested non-index child route', () => {
  const matches = matchRoutes(routes, '/dashboard/settings');

  expect(matches).not.toBeNull();
  expect(matches?.map((m) => m.route.path ?? 'index')).toEqual([
    '/',
    'dashboard',
    'settings',
  ]);
});

test('falls back to wildcard route', () => {
  const matches = matchRoutes(routes, '/unknown/path');

  expect(matches).not.toBeNull();
  expect(matches?.[0]?.route.path).toBe('*');
});
