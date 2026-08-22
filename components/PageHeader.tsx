import type { ReactNode } from 'react';
import { Aurora } from './Aurora';
import { Container, Eyebrow } from './Section';

export function PageHeader({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden pb-14 pt-16 sm:pb-20 sm:pt-24">
      <Aurora intensity="soft" />
      <Container className="relative">
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
          <h1 className="text-[2.5rem] font-extrabold leading-[1.05] sm:text-[3.25rem]">
            {title}
          </h1>
          {body ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {body}
            </p>
          ) : null}
          {children ? <div className="mt-9">{children}</div> : null}
        </div>
      </Container>
    </section>
  );
}

/**
 * Long-form text styling for the legal pages. Tailwind Typography isn't
 * installed, so headings and spacing are set explicitly here.
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        max-w-prose text-[0.975rem] leading-[1.75] text-ink-muted
        [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4
        [&_h2]:mb-3 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink
        [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-ink
        [&_li]:mb-2
        [&_p]:mb-4
        [&_strong]:font-semibold [&_strong]:text-ink
        [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5
      "
    >
      {children}
    </div>
  );
}
