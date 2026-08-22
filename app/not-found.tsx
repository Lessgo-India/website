import { Aurora } from '@ui/Aurora';
import { ButtonLink } from '@ui/Button';
import { Container } from '@ui/Section';
import { SiteFooter } from '@ui/SiteFooter';
import { SiteHeader } from '@ui/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="content">
        <section className="relative isolate overflow-hidden py-28 sm:py-40">
          <Aurora intensity="soft" />
          <Container className="relative text-center">
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-ink-faint">
              404
            </p>
            <h1 className="mx-auto mt-5 max-w-xl text-[2.25rem] font-extrabold leading-[1.05] sm:text-[3rem]">
              This plan <span className="text-gradient">fell through</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base text-ink-muted">
              The page you were after does not exist. The good news is your friends are still
              free tonight.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/" size="lg">
                Back home
              </ButtonLink>
              <ButtonLink href="/help" variant="secondary" size="lg">
                Get help
              </ButtonLink>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
