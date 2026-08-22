import { Link2, Share2 } from 'lucide-react';
import { shareLoop } from '@content/site';
import { Container, Section, SectionHeading } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { Avatar } from '@ui/phone/PhoneFrame';

export function ShareLoop() {
  return (
    <Section tone="raised" id="share">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow={shareLoop.eyebrow}
              title={
                <>
                  Send a link. They can{' '}
                  <span className="text-gradient">RSVP from the browser</span>.
                </>
              }
              body={shareLoop.body}
            />

            <dl className="mt-9 space-y-6">
              {shareLoop.points.map((point) => (
                <div key={point.title} className="flex gap-4">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-profile-tint">
                    <Link2 className="h-4 w-4 text-profile" aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="font-semibold text-ink">{point.title}</dt>
                    <dd className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted">
                      {point.body}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* ── Shared-link preview, as it appears in a chat ───────────────── */}
          <Reveal delay={120} className="relative">
            <div
              aria-hidden="true"
              className="mx-auto max-w-[420px] rounded-[28px] border border-line bg-bg p-5 shadow-lift"
            >
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <Avatar name="Rohan" size={28} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Rohan</p>
                  <p className="text-[0.7rem] text-ink-faint">online</p>
                </div>
                <Share2 className="h-4 w-4 text-ink-faint" />
              </div>

              <div className="mt-4 flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-2 p-2.5">
                  <div className="overflow-hidden rounded-xl border border-line bg-surface">
                    <div
                      className="h-24"
                      style={{
                        background: 'linear-gradient(130deg, #1A2980, #26D0CE 55%, #8E54E9)',
                      }}
                    />
                    <div className="p-3">
                      <p className="text-[0.7rem] uppercase tracking-wide text-ink-faint">
                        lessgo.com
                      </p>
                      <p className="mt-1 text-sm font-bold leading-tight">
                        Goa, but make it sorted
                      </p>
                      <p className="mt-1 text-[0.75rem] text-ink-muted">
                        Fri, 14 Nov · 7:00 AM · Anjuna, Goa
                      </p>
                    </div>
                  </div>
                  <p className="px-1 pt-2 text-sm text-ink">you in? 👀</p>
                </div>
              </div>

              {/* The RSVP that happens without an install */}
              <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-faint">
                  Opened in browser
                </p>
                <p className="mt-2 text-sm font-semibold">Are you in?</p>
                <div className="mt-3 flex gap-2">
                  <span className="flex-1 rounded-full gradient-brand py-2 text-center text-xs font-bold text-white">
                    Going
                  </span>
                  <span className="flex-1 rounded-full border border-line py-2 text-center text-xs font-semibold text-ink-muted">
                    Maybe
                  </span>
                  <span className="flex-1 rounded-full border border-line py-2 text-center text-xs font-semibold text-ink-muted">
                    Can&apos;t
                  </span>
                </div>
                <p className="mt-3 text-center text-[0.7rem] text-ink-faint">
                  No download needed
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
