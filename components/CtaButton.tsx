'use client';

import type { ComponentProps } from 'react';
import { ButtonLink } from './Button';
import { track } from './analytics';

/**
 * Primary call-to-action. Identical to ButtonLink, but reports the click so we
 * can read the install funnel per placement.
 */
export function CtaButton({
  location,
  children,
  ...props
}: { location: string } & ComponentProps<typeof ButtonLink>) {
  return (
    <ButtonLink
      {...props}
      onClick={() =>
        track('cta_clicked', {
          location,
          label: typeof children === 'string' ? children : undefined,
          href: props.href,
        })
      }
    >
      {children}
    </ButtonLink>
  );
}
