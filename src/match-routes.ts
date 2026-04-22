import { Match, RouteConfig } from './types';

function trim(path?: string) {
  return path?.replace(/^\/+|\/+$/g, '');
}

export function matchRoutes(routes: RouteConfig[], pathname: string): Match[] | null {
  const segments = trim(pathname)?.split('/') || [];
  return matchRecursive(routes, segments);
}

function matchRecursive(routes: RouteConfig[], segments: string[]): Match[] | null {
  const sorted = [...routes].sort((a, b) => getWeight(a) - getWeight(b));

  for (const route of sorted) {
    const isIndex = route.index === true;
    const params: Record<string, string> = {};
    let matched = false;

    if (isIndex && !segments[0] && route.element) return [{ route, params }];

    const pathSegments = trim(route.path)?.split('/') || [];

    pathSegments.every((item, i) => {
      if (segments[i] === undefined) {
        matched = false;
        return false;
      }
      const { matched: itemMatched, params: paramMatch } = matchSegment(item, segments[i]);
      matched = itemMatched;
      Object.assign(params, paramMatch);

      return matched;
    });

    if (!matched) continue;

    const remaining = segments.slice(pathSegments.length);

    if (route.children) {
      const childMatch = matchRecursive(route.children, route.path === '/' ? segments : remaining);
      if (childMatch) return [{ route, params }, ...childMatch];
    }

    const matchRemaining = remaining.length !== 0 && route.path !== '*';

    if (!route.children && route.element && !matchRemaining) return [{ route, params }];
  }

  return null;
}

function matchSegment(
  routePath: string | undefined,
  segment: string,
): { matched: boolean; params: Record<string, string> } {
  if (routePath === '') return { matched: true, params: {} };

  if (!routePath) return { matched: false, params: {} };

  if (routePath === '*') return { matched: true, params: {} };

  if (routePath.startsWith(':')) {
    const paramMatch = routePath.slice(1);
    if (paramMatch) return { matched: true, params: { [paramMatch]: segment } };
  }

  return { matched: routePath === segment, params: {} };
}

const getWeight = (r: RouteConfig): number => {
  if (r.index) return 0;
  if (r.path === '/') return 2;
  if (r.path?.startsWith('/:')) return 3;
  if (r.path?.startsWith(':')) return 3;
  if (r.path === '*') return 4;
  return 1;
};
