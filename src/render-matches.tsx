import React from 'react';
import { Match } from './types';
import { OutletProvider } from './outlet';

export function renderMatches(matches: Match[] = []): React.ReactNode {
  return matches.reduceRight<React.ReactNode>((child, match) => {
    const { layout, element } = match.route;
    const node = element || child;
    const routeKey = match.route.path || 'index';

    if (React.isValidElement(layout)) {
      return (
        <OutletProvider key={routeKey} value={node}>
          {layout}
        </OutletProvider>
      );
    }

    return node;
  }, null);
}
