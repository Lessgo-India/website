const INTERNAL_ROOTS = ['/admin', '/partner'] as const;

/**
 * Internal tools — the admin console and the partner (merchant) portal. They
 * have their own sign-in, load no marketing analytics and show no consent
 * banner.
 */
export function isInternalToolPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return INTERNAL_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
