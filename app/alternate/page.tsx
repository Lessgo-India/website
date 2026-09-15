import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Plus, Send } from 'lucide-react';
import { alternateWebsite as copy } from '@content/alternate-website';
import { site } from '@content/site';
import { EarlyAccessForm } from '@ui/EarlyAccessForm';
import { MobileNavigation, PlanIdeas, ProductTour } from './alternate-website';
import styles from './alternate-website.module.css';

export const metadata: Metadata = {
  title: { absolute: copy.metadata.title },
  description: copy.metadata.description,
  alternates: { canonical: '/alternate' },
  robots: { index: false, follow: true },
  openGraph: {
    title: copy.metadata.title,
    description: copy.metadata.description,
    url: '/alternate',
  },
};

export default function AlternateWebsite() {
  return (
    <div className={styles.website} data-alternate-website>
      <header className={styles.header}>
        <Link href="/alternate" className={styles.brand} aria-label={copy.navigation.home}>
          <Image src={site.logo} alt="" width={32} height={32} unoptimized />
          {site.name}
        </Link>
        <nav className={styles.navigation} aria-label={copy.navigation.label}>
          <a href="#plans">{copy.navigation.plans}</a>
          <a href="#product">{copy.navigation.product}</a>
          <Link href="/me">{copy.navigation.signIn}</Link>
        </nav>
        <a href="#join" className={styles.headerCta}>
          <span className={styles.fullCta}>{copy.navigation.updates}</span>
          <span className={styles.shortCta}>{copy.navigation.shortUpdates}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <MobileNavigation />
      </header>

      <main id="content">
        <section className={styles.hero} aria-labelledby="alternate-title">
          <Image
            src={copy.hero.image}
            alt={copy.hero.imageAlt}
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
            <h1 id="alternate-title">{copy.hero.title}</h1>
            <p className={styles.heroTagline}>{copy.hero.tagline}</p>
            <p className={styles.heroDescription}>{copy.hero.description}</p>
            <div className={styles.heroActions}>
              <a href="#join" className={styles.primaryButton}>
                {copy.hero.primaryCta}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a href="#plans" className={styles.heroLink}>
                {copy.hero.secondaryCta}
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
          <p className={styles.heroCaption}>{copy.hero.caption}</p>
        </section>

        <section id="plans" className={styles.section} aria-labelledby="plans-title">
          <p className={styles.eyebrow}>{copy.plans.eyebrow}</p>
          <h2 id="plans-title">{copy.plans.title}</h2>
          <p className={styles.sectionDescription}>{copy.plans.description}</p>
          <PlanIdeas />
        </section>

        <section id="product" className={styles.productBand} aria-labelledby="product-title">
          <div className={styles.section}>
            <p className={styles.eyebrow}>{copy.product.eyebrow}</p>
            <h2 id="product-title">{copy.product.title}</h2>
            <p className={styles.sectionDescription}>{copy.product.description}</p>
            <ProductTour />
          </div>
        </section>

        <section className={styles.inviteBand} aria-labelledby="invite-title">
          <div className={`${styles.section} ${styles.inviteLayout}`}>
            <div className={styles.inviteCopy}>
              <span className={styles.inviteIcon}><Send size={25} aria-hidden="true" /></span>
              <p className={styles.eyebrow}>{copy.invite.eyebrow}</p>
              <h2 id="invite-title">{copy.invite.title}</h2>
              <p className={styles.sectionDescription}>{copy.invite.description}</p>
              <Link href="/me" className={styles.textLink}>
                {copy.invite.cta}<ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <ol className={styles.inviteSteps}>
              {copy.invite.steps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <div><h3>{step.title}</h3><p>{step.detail}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${styles.section} ${styles.faqLayout}`} aria-labelledby="faq-title">
          <div>
            <p className={styles.eyebrow}>{copy.faq.eyebrow}</p>
            <h2 id="faq-title">{copy.faq.title}</h2>
          </div>
          <div className={styles.faqItems}>
            {copy.faq.items.map((item) => (
              <details key={item.question} name="alternate-faq">
                <summary>{item.question}<Plus size={18} aria-hidden="true" /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="join" className={styles.joinBand} aria-labelledby="join-title">
          <div className={styles.section}>
            <p className={styles.eyebrow}>{copy.join.eyebrow}</p>
            <h2 id="join-title">{copy.join.title}</h2>
            <p className={styles.sectionDescription}>{copy.join.description}</p>
            <div className={styles.joinForm}>
              <EarlyAccessForm compact source="alternate-website" />
            </div>
            <p className={styles.joinPrivacy}>
              {copy.join.privacyLead} <Link href="/privacy">{copy.join.privacyLink}</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div>
            <Link href="/alternate" className={styles.brand} aria-label={copy.navigation.home}>
              <Image src={site.logo} alt="" width={32} height={32} unoptimized />
              {site.name}
            </Link>
            <p>{copy.footer.tagline}</p>
          </div>
          <nav aria-label={copy.footer.label}>
            {copy.footer.links.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>
        <p className={styles.footerBottom}>{copy.footer.madeIn}</p>
      </footer>
    </div>
  );
}