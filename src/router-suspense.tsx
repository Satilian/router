import { Suspense, type PropsWithChildren, type ReactNode } from 'react';
import { useNavigation } from './router-provider';
export function RouterSuspense({
  children,
  fallback,
}: PropsWithChildren<{ fallback: ReactNode }>) {
  const { status } = useNavigation();
  return (
    <>
      <div hidden={status === 'loading'}>
        <Suspense fallback={fallback}>{children}</Suspense>
      </div>
      {status === 'loading' ? fallback : null}
    </>
  );
}
