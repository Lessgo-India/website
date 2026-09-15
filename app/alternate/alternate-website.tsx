'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Gamepad2,
  Heart,
  MapPin,
  Menu,
  Mountain,
  Sparkles,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { alternateWebsite as copy } from '@content/alternate-website';
import { APP_SCREENSHOTS } from '@ui/phone/AppScreenshot';
import styles from './alternate-website.module.css';

type PlanIdea = (typeof copy.plans.ideas)[number];
type Category = (typeof copy.plans.categories)[number]['id'];

const categoryIcons = {
  sparkles: Sparkles,
  utensils: Utensils,
  mountain: Mountain,
  games: Gamepad2,
};

const productIcons = {
  calendar: CalendarDays,
  wallet: Wallet,
  users: Users,
  sparkles: Sparkles,
  heart: Heart,
};

export function ProductTour() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = copy.product.tabs[activeIndex];
  const screenshot = APP_SCREENSHOTS[activeTab.screen];

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % copy.product.tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + copy.product.tabs.length) % copy.product.tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = copy.product.tabs.length - 1;
    else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    document.getElementById(`tour-tab-${copy.product.tabs[nextIndex].id}`)?.focus();
  }

  return (
    <>
      <div className={styles.tourTabs} role="tablist" aria-label={copy.product.tabsLabel}>
        {copy.product.tabs.map((tab, index) => {
          const Icon = productIcons[tab.icon];
          return (
            <button
              key={tab.id}
              type="button"
              id={`tour-tab-${tab.id}`}
              role="tab"
              aria-selected={activeIndex === index}
              aria-controls={`tour-panel-${tab.id}`}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => moveTab(event, index)}
            >
              <Icon size={19} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
      {copy.product.tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tour-panel-${tab.id}`}
          aria-labelledby={`tour-tab-${tab.id}`}
          hidden={activeIndex !== index}
          tabIndex={0}
          className={styles.productPanel}
        >
          {activeIndex === index && (
            <>
              <div className={styles.tourCopy}>
                <p className={styles.eyebrow}>{tab.eyebrow}</p>
                <h3>{tab.title}</h3>
                <p className={styles.tourDescription}>{tab.description}</p>
                <ul className={styles.checklist}>
                  {tab.points.map((point) => (
                    <li key={point}><Check size={18} aria-hidden="true" />{point}</li>
                  ))}
                </ul>
                <a href="#join" className={styles.textLink}>
                  {copy.product.cta}<ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
              <div className={styles.tourVisual}>
                <div className={styles.phone}>
                  <Image
                    src={screenshot.light}
                    alt={`Lessgo ${screenshot.label} screen`}
                    width={1272}
                    height={2800}
                    sizes="(max-width: 600px) 230px, 250px"
                    className={styles.appScreenshot}
                  />
                </div>
                <p className={styles.screenshotLabel}>{copy.product.screenshotLabel}</p>
                <p className={styles.tourNote}>{tab.note}</p>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  );
}

export function MobileNavigation() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    menuRef.current?.removeAttribute('open');
  }

  return (
    <details
      ref={menuRef}
      className={styles.mobileNavigation}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          closeMenu();
          menuRef.current?.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label={copy.navigation.menu} title={copy.navigation.menu}>
        <Menu size={21} aria-hidden="true" />
      </summary>
      <nav aria-label={copy.navigation.label}>
        <a href="#plans" onClick={closeMenu}>{copy.navigation.plans}</a>
        <a href="#product" onClick={closeMenu}>{copy.navigation.product}</a>
        <Link href="/me" onClick={closeMenu}>{copy.navigation.signIn}</Link>
      </nav>
    </details>
  );
}

export function PlanIdeas() {
  const [category, setCategory] = useState<Category>('all');
  const [selectedIdea, setSelectedIdea] = useState<PlanIdea | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visibleIdeas = copy.plans.ideas.filter(
    (idea) => category === 'all' || idea.category === category,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!selectedIdea || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [selectedIdea]);

  return (
    <>
      <div className={styles.filters} role="group" aria-label={copy.plans.filterLabel}>
        {copy.plans.categories.map((item) => {
          const Icon = categoryIcons[item.icon];
          return (
            <button
              type="button"
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              <Icon size={16} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="sr-only" role="status">
        {visibleIdeas.length} {copy.plans.countLabel}
      </p>
      <div className={styles.planGrid}>
        {visibleIdeas.map((idea) => (
          <button
            key={idea.id}
            type="button"
            className={styles.planCard}
            aria-haspopup="dialog"
            aria-label={`${copy.plans.openLabel} ${idea.title}`}
            onClick={() => setSelectedIdea(idea)}
            data-plan-card
          >
            <span className={styles.planImage}>
              <Image
                src={idea.image}
                alt={idea.imageAlt}
                fill
                sizes="(max-width: 600px) 90vw, (max-width: 1000px) 44vw, 280px"
              />
              <span className={styles.planArrow}><ArrowRight size={19} aria-hidden="true" /></span>
            </span>
            <span className={styles.planTag}>{idea.tag}</span>
            <span className={styles.planTitle}>{idea.title}</span>
            <span className={styles.planSubtitle}>{idea.subtitle}</span>
          </button>
        ))}
      </div>
      <p className={styles.planNote}>{copy.plans.note}</p>

      <dialog
        ref={dialogRef}
        className={styles.planDialog}
        aria-labelledby="plan-preview-title"
        aria-describedby="plan-preview-description"
        onClose={() => setSelectedIdea(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        {selectedIdea && (
          <div className={styles.dialogContent}>
            <div className={styles.dialogImage}>
              <Image
                src={selectedIdea.image}
                alt={selectedIdea.imageAlt}
                fill
                sizes="(max-width: 640px) 94vw, 560px"
              />
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => dialogRef.current?.close()}
              aria-label={copy.plans.closeLabel}
              title={copy.plans.closeLabel}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <div className={styles.dialogBody}>
              <p className={styles.eyebrow}>{copy.plans.previewLabel}</p>
              <h2 id="plan-preview-title">{selectedIdea.title}</h2>
              <div className={styles.ideaDetails}>
                <span><Clock3 size={16} aria-hidden="true" />{selectedIdea.timing}</span>
                <span><MapPin size={16} aria-hidden="true" />{selectedIdea.location}</span>
              </div>
              <p id="plan-preview-description">{selectedIdea.description}</p>
              <h3>{copy.plans.checklistTitle}</h3>
              <ul className={styles.checklist}>
                {selectedIdea.checklist.map((item) => (
                  <li key={item}><Check size={17} aria-hidden="true" />{item}</li>
                ))}
              </ul>
              <a
                href="#join"
                className={styles.primaryButton}
                onClick={() => dialogRef.current?.close()}
              >
                {copy.plans.previewCta}<ArrowRight size={18} aria-hidden="true" />
              </a>
              <p className={styles.launchNote}>{copy.plans.launchNote}</p>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}