import { howItWorks } from '@content/site';
import { Container, Section, SectionHeading } from '@ui/Section';
import { Reveal } from '@ui/Reveal';

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={howItWorks.eyebrow}
            title={
              <>
                Plan tonight in <span className="text-gradient">under a minute</span>.
              </>
            }
          />
        </Reveal>

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {howItWorks.steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 90}>
              <div className="group relative h-full">
                {/* Gradient glow halo — hover only */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 -z-10 rounded-[32px] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-50"
                  style={{ background: 'var(--brand-gradient)' }}
                />
                <div className="relative h-full overflow-hidden rounded-[28px] border border-line bg-surface p-7 transition-transform duration-300 ease-spring group-hover:-translate-y-1">
                  {/* Gradient border — hover only */}
                  <span
                    aria-hidden="true"
                    className="gradient-ring pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-2 -top-6 font-display text-[6rem] font-extrabold leading-none text-ink"
                    style={{ opacity: 0.05 }}
                  >
                    {step.n}
                  </span>
                  <span className="font-mono text-xs font-bold tracking-[0.18em] text-gradient">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
