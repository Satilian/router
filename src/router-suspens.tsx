import {
  createContext,
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  Suspense,
  useContext,
  useState,
} from 'react';

const RouterSuspenseContext = createContext<Dispatch<SetStateAction<boolean>> | null>(null);

export const useRouterSuspenseContext = () => useContext(RouterSuspenseContext);

export const RouterSuspense = ({ children, fallback }: PropsWithChildren & { fallback: ReactNode }) => {
  const [loading, setLoading] = useState(false);

  return (
    <RouterSuspenseContext.Provider value={setLoading}>
      <Suspense fallback={fallback}>{loading ? fallback : children}</Suspense>
    </RouterSuspenseContext.Provider>
  );
};
