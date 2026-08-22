import { finalCta } from '@content/site';
import { Aurora } from '@ui/Aurora';
import { Container } from '@ui/Section';
import { Reveal } from '@ui/Reveal';
import { EarlyAccessForm } from '@ui/EarlyAccessForm';
import { StoreBadges } from '@ui/StoreBadges';

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-32">
      <Aurora intensity="soft" />

      <Container className="relative">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[2.25rem] font-extrabold leading-[1.05] sm:text-[3rem]">
              Your next plan is <span className="text-gradient">one tap away</span>.
            </h2>
            <p className="mt-5 text-base text-ink-muted sm:text-lg">{finalCta.body}</p>

            <div className="mt-9">
              <EarlyAccessForm source="home-final" />
            </div>

            <div className="mt-8 flex justify-center">
              <StoreBadges />
            </div>

            <p className="mt-8 text-sm text-ink-faint">{finalCta.reassure}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
