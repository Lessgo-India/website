import type { ReactNode } from 'react';

export function Container({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`container-page ${className}`}>{children}</div>;
}

export function Section({
  children,
  className = '',
  id,
  tone = 'plain',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'plain' | 'raised';
}) {
  return (
    <section
      id={id}
      className={[
        'relative py-20 sm:py-28',
        tone === 'raised' ? 'bg-bg-elev' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

export function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-xs uppercase tracking-[0.18em] text-ink-faint ${className}`}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'center',
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={[
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      ].join(' ')}
    >
      {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
      <h2 className="text-[2rem] font-bold leading-[1.1] sm:text-[2.6rem]">{title}</h2>
      {body ? (
        <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">{body}</p>
      ) : null}
    </div>
  );
}
