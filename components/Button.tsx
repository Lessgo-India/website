import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-none ' +
  'transition-[transform,box-shadow,background-color,border-color] duration-200 ease-spring ' +
  'active:scale-[0.97] disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary:
    'gradient-brand text-white shadow-[0_10px_30px_-12px_rgba(142,84,233,0.85)] ' +
    'hover:-translate-y-px hover:shadow-[0_18px_44px_-14px_rgba(142,84,233,0.95)]',
  secondary:
    'bg-surface text-ink border border-line hover:-translate-y-px hover:border-line-strong hover:shadow-soft',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-2',
};

const sizes: Record<Size, string> = {
  md: 'min-h-[44px] px-5 text-[0.95rem]',
  lg: 'min-h-[52px] px-7 text-base sm:text-[1.05rem]',
};

function classes(variant: Variant, size: Size, className?: string) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(' ');
}

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>;

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  const isExternal = /^(https?:|mailto:|tel:)/.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes(variant, size, className)}
        rel="noopener noreferrer"
        target={href.startsWith('http') ? '_blank' : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

type ButtonProps = {
  variant?: Variant;
  size?: Size;
} & ComponentProps<'button'>;

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={classes(variant, size, className)} {...rest} />;
}
