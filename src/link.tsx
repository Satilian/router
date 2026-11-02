import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { useRouter } from './router-provider';
export type LinkProps = ComponentPropsWithoutRef<'a'> & {
  to: string;
  scrollToTop?: boolean;
};
export function Link({
  to,
  scrollToTop,
  onClick,
  target,
  download,
  children,
  ...rest
}: LinkProps) {
  const { navigate } = useRouter();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      (target && target !== '_self') ||
      download !== undefined ||
      new URL(to, window.location.href).origin !== window.location.origin
    )
      return;
    event.preventDefault();
    void navigate(to, { scrollToTop }).catch(() => {
      /* Provider exposes the navigation error. */
    });
  };
  return (
    <a
      {...rest}
      href={to}
      target={target}
      download={download}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
