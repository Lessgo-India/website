import { ArrowRight, CalendarCheck, MapPin, Users, Wallet } from 'lucide-react';
import { problem } from '@content/site';
import { Container, Section, SectionHeading } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { Avatar } from '@ui/phone/PhoneFrame';

export function ChaosToPlan() {
  return (
    <Section tone="raised" className="overflow-hidden">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={problem.eyebrow}
            title={
              <>
                The plan dies in the <span className="text-gradient">group chat</span>.
              </>
            }
            body={problem.body}
          />
        </Reveal>

        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
          {/* ── Before ───────────────────────────────────────────────────── */}
          <Reveal delay={60}>
            <div className="relative">
              <span className="mb-4 inline-block font-mono text-xs uppercase tracking-[0.18em] text-vibes">
                Before
              </span>
              <div className="relative overflow-hidden rounded-[28px] border border-line bg-bg p-5">
                <div className="space-y-2.5">
                  {problem.chaos.map((msg, i) => (
                    <div
                      key={`${msg.from}-${i}`}
                      className={`flex items-end gap-2 ${i % 3 === 1 ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar name={msg.from} size={24} />
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                          i % 3 === 1
                            ? 'rounded-br-md bg-surface-2 text-ink'
                            : 'rounded-bl-md bg-surface text-ink-muted'
                        }`}
                      >
                        <span className="mb-0.5 block text-[0.65rem] font-semibold text-ink-faint">
                          {msg.from}
                        </span>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Fades the thread out — it never ends, that's the joke. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-bg-elev px-3.5 py-1.5 text-xs font-semibold text-ink-faint">
                  …47 messages later, still nothing
                </p>
              </div>
            </div>
          </Reveal>

          {/* ── Transition ───────────────────────────────────────────────── */}
          <Reveal delay={120} className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full gradient-brand text-white shadow-pop">
              <ArrowRight
                className="h-6 w-6 rotate-90 lg:rotate-0"
                aria-hidden="true"
              />
              <span className="sr-only">becomes</span>
            </span>
          </Reveal>

          {/* ── After ────────────────────────────────────────────────────── */}
          <Reveal delay={180}>
            <div>
              <span className="mb-4 inline-block font-mono text-xs uppercase tracking-[0.18em] text-split">
                After
              </span>
              <div className="ring-gradient relative overflow-hidden rounded-[28px] border border-line bg-bg p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-faint">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1">✈️ Trip</span>
                  <span className="rounded-full bg-split-tint px-2.5 py-1 text-split">
                    Confirmed
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-bold leading-tight">{problem.after.title}</h3>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <dt className="sr-only">When</dt>
                    <dd className="text-ink-muted">{problem.after.when}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <dt className="sr-only">Where</dt>
                    <dd className="text-ink-muted">{problem.after.where}</dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <dt className="sr-only">Who</dt>
                    <dd className="text-ink-muted">
                      {problem.after.going} going · {problem.after.maybe} maybe
                    </dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 shrink-0 text-split" aria-hidden="true" />
                    <dt className="sr-only">Money</dt>
                    <dd className="font-semibold text-split">{problem.after.settled}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                  <div className="flex -space-x-2">
                    {['Ananya', 'Rohan', 'Meera', 'Kabir', 'Ishaan'].map((n) => (
                      <Avatar key={n} name={n} size={30} ring="var(--bg)" />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-ink-faint">One tap, done</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
