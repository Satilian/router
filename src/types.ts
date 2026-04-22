/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from 'react';

type RouteBase = {
  layout?: ReactNode;
  loader?: (ctx: LoaderCtx) => Promise<any> | any;
  ssrCache?: SsrCacheOption;
};

export type SsrCacheConfig = {
  enabled?: boolean;
  min?: number;
  max?: number;
  key?: (ctx: { pathname: string; originalUrl: string }) => string;
};

export type SsrCacheOption = boolean | SsrCacheConfig;

type RoutePathElement = {
  path: string;
  element: ReactNode;
  index?: never;
  children?: never;
};

type RouteIndexElement = {
  index: true;
  element: ReactNode;
  path?: never;
  children?: never;
};

type RoutePathChildren = {
  path: string;
  children: RouteConfig[];
  element?: never;
  index?: never;
};

export type RouteConfig = RouteBase &
  (RoutePathElement | RouteIndexElement | RoutePathChildren);

export type LoaderCtx<T = Record<string, unknown>> = {
  params: Record<string, string>;
  pathname: string;
  query: Record<string, unknown>;
} & T;

export interface Match {
  route: RouteConfig;
  params: Record<string, string>;
}

export interface RouterContextType {
  matches: Match[] | null;
  navigate: (
    to: string,
    options?: { shallow?: boolean; replace?: boolean; scrollToTop?: boolean },
  ) => Promise<void>;
  back: () => void;
  pathname: string;
  loaderData: any;
  params: Record<string, string>;
  query: Record<string, unknown>;
  setQuery: (
    newQuery: Record<string, unknown>,
    options?: NavigateOptions,
  ) => void;
}

export type RoutesConfigObject = {
  loader?: (ctx: LoaderCtx) => Promise<any> | any;
  routes: RouteConfig[];
};

export type RouterProviderProps = {
  pathname?: string; // для SSR
  query?: Record<string, unknown>; // для SSR
  initialState?: Record<string, any>; // для SSR
  matches?: Match[] | null; // для SSR
  config: RoutesConfigObject;
};

export type NavigateOptions = {
  shallow?: boolean;
  replace?: boolean;
  scrollToTop?: boolean;
};
