import React, { ComponentPropsWithoutRef } from 'react';
import { useRouter } from './router-provider';
import { useRouterSuspenseContext } from './router-suspense';

export const Link = ({
  to,
  children,
  scrollToTop,
  ...rest
}: ComponentPropsWithoutRef<'a'> & {
  to: string;
  scrollToTop?: boolean;
}) => {
  const setLoading = useRouterSuspenseContext();
  const { navigate } = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    // Only handle left click without modifiers (Ctrl, Cmd, Shift, Alt)
    // Allow native behavior for middle-click, right-click, Ctrl+click, etc.
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();
    setLoading?.(true);
    await navigate(to, { scrollToTop });
    setLoading?.(false);
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};
