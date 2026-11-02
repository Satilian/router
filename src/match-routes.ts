import type { Match, RouteConfig } from './types';

const segments = (path: string) => path.split('/').filter(Boolean);

export function matchRoutes(
  routes: RouteConfig[],
  pathname: string,
): Match[] | null {
  const input = segments(pathname);
  const candidates: { matches: Match[]; score: number[] }[] = [];
  function visit(
    items: RouteConfig[],
    offset: number,
    parents: Match[],
    score: number[],
  ) {
    for (const route of items) {
      const parts = segments(route.path ?? '');
      const params: Record<string, string> = {};
      let cursor = offset;
      const rank = [...score];
      let valid = true;
      for (const part of parts) {
        if (part === '*') {
          cursor = input.length;
          rank.push(1);
          break;
        }
        const value = input[cursor];
        if (value === undefined || (!part.startsWith(':') && part !== value)) {
          valid = false;
          break;
        }
        if (part.startsWith(':')) params[part.slice(1)] = value;
        rank.push(part.startsWith(':') ? 2 : 3);
        cursor++;
      }
      if (!valid) continue;
      const matches = [...parents, { route, params }];
      if (route.children) visit(route.children, cursor, matches, rank);
      else if (cursor === input.length && (!route.index || cursor === offset))
        candidates.push({ matches, score: [...rank, route.index ? 2 : 0] });
    }
  }
  visit(routes, 0, [], []);
  candidates.sort((a, b) => {
    for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
      const difference = (b.score[i] ?? 0) - (a.score[i] ?? 0);
      if (difference) return difference;
    }
    return 0;
  });
  return candidates[0]?.matches ?? null;
}
