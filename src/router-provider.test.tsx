import { expect, test } from '@rstest/core';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, useRouter } from './router-provider';
import type { RouteConfig } from './types';

import { afterEach } from '@rstest/core';

afterEach(() => {
  cleanup();
});

function Probe() {
  const { pathname, query, navigate, setQuery } = useRouter();

  return (
    <div>
      <div data-testid="pathname">{pathname}</div>
      <div data-testid="query">{String(query.page ?? '')}</div>
      <button type="button" onClick={() => void navigate('/users/7')}>
        go-user
      </button>
      <button type="button" onClick={() => setQuery({ page: '2' })}>
        set-query
      </button>
    </div>
  );
}

const routes: RouteConfig[] = [
  { path: '/', element: <Probe /> },
  { path: '/users/:id', element: <Probe /> },
];

test('navigate updates pathname', async () => {
  render(
    <RouterProvider
      pathname="/"
      config={{
        routes,
      }}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: 'go-user' }));

  await waitFor(() => {
    expect(screen.getByTestId('pathname').textContent).toBe('/users/7');
  });
});

test('setQuery updates query in context', async () => {
  render(
    <RouterProvider
      pathname="/"
      query={{ page: '1' }}
      config={{
        routes,
      }}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: 'set-query' }));

  await waitFor(() => {
    expect(screen.getByTestId('query').textContent).toBe('2');
  });
});

test('popstate navigation updates pathname', async () => {
  render(
    <RouterProvider
      pathname="/"
      config={{
        routes,
      }}
    />,
  );

  window.history.pushState({}, '', '/users/11');
  window.dispatchEvent(new PopStateEvent('popstate'));

  await waitFor(() => {
    expect(screen.getByTestId('pathname').textContent).toBe('/users/11');
  });
});

test('renders 404 when no matches found', () => {
  const noMatchRoutes: RouteConfig[] = [{ path: '/known', element: <Probe /> }];

  render(
    <RouterProvider
      pathname="/missing"
      config={{
        routes: noMatchRoutes,
      }}
    />,
  );

  expect(screen.getByText('404 Matches Not Found')).toBeTruthy();
});
