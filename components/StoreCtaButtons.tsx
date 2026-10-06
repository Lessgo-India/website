import { hero } from '@content/site';
import { Button } from '@ui/Button';
import { CtaButton } from '@ui/CtaButton';
import { ANDROID_APP_URL } from '@web/lib/config';

export function StoreCtaButtons() {
  return (
    <>
      <CtaButton href={ANDROID_APP_URL} size="lg" location="hero">
        {hero.primaryCta}
      </CtaButton>
      <Button variant="secondary" size="lg" disabled>
        {hero.secondaryCta}
      </Button>
    </>
  );
}
