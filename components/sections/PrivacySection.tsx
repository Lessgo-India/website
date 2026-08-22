import { ShieldCheck } from 'lucide-react';
import { privacy } from '@content/site';
import { Container, Section, SectionHeading } from '@ui/Section';
import { Reveal } from '@ui/Reveal';

export function PrivacySection() {
  return (
    <Section id="privacy">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={privacy.eyebrow}
            title={
              <>
                Your contacts are <span className="text-gradient">not our product</span>.
              </>
            }
            body={privacy.body}
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {privacy.promises.map((promise, i) => (
            <Reveal key={promise.title} delay={i * 80}>
              <div className="h-full rounded-[28px] border border-line bg-surface p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-split-tint">
                  <ShieldCheck className="h-5 w-5 text-split" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{promise.title}</h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-muted">
                  {promise.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Every permission the app asks for, and why — stated plainly. */}
        <Reveal delay={120}>
          <div className="mt-8 overflow-hidden rounded-[28px] border border-line bg-bg-elev">
            <div className="border-b border-line px-7 py-5">
              <h3 className="text-base font-bold">Every permission we ask for, and why</h3>
            </div>
            <dl className="divide-y divide-line">
              {privacy.everyPermission.map((p) => (
                <div key={p.name} className="flex flex-col gap-1 px-7 py-4 sm:flex-row sm:gap-6">
                  <dt className="w-32 shrink-0 text-sm font-semibold text-ink">{p.name}</dt>
                  <dd className="text-sm text-ink-muted">{p.why}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
