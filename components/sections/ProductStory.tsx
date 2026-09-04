'use client';

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleUserRound,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ComponentType, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { features, hero, productStory, type Domain } from '@content/site';
import { ButtonLink } from '@ui/Button';
import { CtaButton } from '@ui/CtaButton';
import { GlowIcons } from '@ui/GlowIcons';
import { Container } from '@ui/Section';
import { PhoneFrame } from '@ui/phone/PhoneFrame';
import {
  BalancesScreen,
  EventsScreen,
  GroupsScreen,
  ProfileScreen,
  VibesScreen,
} from '@ui/phone/screens';

type StoryDomain = {
  Screen: ComponentType;
  accent: string;
  tint: string;
  onAccent: string;
};

const STORY_DOMAINS: Record<Domain, StoryDomain> = {
  events: {
    Screen: EventsScreen,
    accent: 'var(--events)',
    tint: 'var(--events-tint)',
    onAccent: 'var(--events-on)',
  },
  split: {
    Screen: BalancesScreen,
    accent: 'var(--split)',
    tint: 'var(--split-tint)',
    onAccent: 'var(--split-on)',
  },
  vibes: {
    Screen: VibesScreen,
    accent: 'var(--vibes)',
    tint: 'var(--vibes-tint)',
    onAccent: 'var(--vibes-on)',
  },
  groups: {
    Screen: GroupsScreen,
    accent: 'var(--groups)',
    tint: 'var(--groups-tint)',
    onAccent: 'var(--groups-on)',
  },
  profile: {
    Screen: ProfileScreen,
    accent: 'var(--profile)',
    tint: 'var(--profile-tint)',
    onAccent: 'var(--profile-on)',
  },
};

const CHAPTERS = features.map((feature) => ({
  ...feature,
  ...STORY_DOMAINS[feature.domain],
}));

const HERO_ICONS: Record<Domain, LucideIcon> = {
  events: CalendarDays,
  split: WalletCards,
  vibes: Sparkles,
  groups: Users,
  profile: CircleUserRound,
};

const HERO_SCREENS = CHAPTERS.map((chapter) => ({
  ...chapter,
  Icon: HERO_ICONS[chapter.domain],
}));

const MOBILE_STORY_QUERY = '(max-width: 767px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMobileStory(callback: () => void) {
  const query = window.matchMedia(MOBILE_STORY_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function getMobileStorySnapshot() {
  return window.matchMedia(MOBILE_STORY_QUERY).matches;
}

function getMobileStoryServerSnapshot() {
  return false;
}

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

const WAVE_PATHS = [
  'M0 0H1440V184C1298 224 1172 167 1027 207C890 245 785 177 642 211C498 245 390 183 251 215C151 238 70 226 0 202V0Z',
  'M0 0H1440V201C1300 168 1174 232 1030 194C886 156 780 231 639 198C499 166 387 230 250 196C150 172 70 190 0 214V0Z',
  'M0 0H1440V190C1299 236 1171 179 1028 218C887 257 782 166 641 202C500 239 389 174 250 207C150 231 70 216 0 194V0Z',
];

function BrandWave({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg
      data-brand-wave
      aria-hidden="true"
      viewBox="0 0 1440 280"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 -z-30 h-[36%] min-h-[220px] max-h-[290px] w-full overflow-visible"
    >
      <defs>
        <linearGradient
          id="hero-wave-gradient"
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="1440"
          y1="0"
          y2="0"
        >
          {['#22d3c5', '#4776e6', '#8e54e9', '#ec008c'].map((color, index, colors) => (
            <motion.stop
              key={color}
              offset={`${index * 33.333}%`}
              stopColor={color}
              animate={
                reduceMotion
                  ? undefined
                  : { stopColor: [...colors.slice(index), ...colors.slice(0, index), color] }
              }
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </linearGradient>
      </defs>
      <motion.path
        d={WAVE_PATHS[0]}
        fill="url(#hero-wave-gradient)"
        initial={false}
        animate={reduceMotion ? undefined : { d: [...WAVE_PATHS, WAVE_PATHS[0]] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        opacity="0.24"
      />
      <motion.path
        d={WAVE_PATHS[1]}
        fill="url(#hero-wave-gradient)"
        initial={false}
        animate={reduceMotion ? undefined : { d: [WAVE_PATHS[1], WAVE_PATHS[2], WAVE_PATHS[1]] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        opacity="0.08"
      />
    </svg>
  );
}

function HeroPhoneDock({ activeIndex, onSelect }: { activeIndex: number; onSelect: (index: number) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Choose app preview"
      className="absolute inset-x-[7px] bottom-[7px] z-30 flex items-center justify-between gap-[2px] rounded-[22px] border p-[5px] shadow-pop backdrop-blur-xl"
      style={{ background: 'var(--as-tabbar)', borderColor: 'var(--as-tabline)' }}
    >
      {HERO_SCREENS.map((screen, index) => {
        const selected = index === activeIndex;
        const Icon = screen.Icon;

        return (
          <button
            key={screen.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={`Show ${screen.tab}`}
            title={screen.tab}
            onClick={() => onSelect(index)}
            className={`relative flex h-6 min-w-0 items-center justify-center overflow-hidden rounded-full sm:h-8 ${
              selected ? 'flex-1 sm:flex-none sm:gap-1 sm:px-2.5' : 'flex-1 sm:w-7 sm:flex-none'
            }`}
            style={{ color: selected ? screen.onAccent : screen.accent }}
          >
            {selected ? (
              <motion.span
                layoutId="hero-phone-active-tab"
                className="absolute inset-0 rounded-full"
                style={{ background: screen.accent }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className="relative z-10 h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {selected ? (
              <span className="relative z-10 hidden text-[0.58rem] font-extrabold sm:inline">{screen.tab}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function HeroPhoneShowcase({ reduceMotion }: { reduceMotion: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 180, damping: 22, mass: 0.45 });
  const rotateY = useSpring(tiltY, { stiffness: 180, damping: 22, mass: 0.45 });
  const activeScreen = HERO_SCREENS[activeIndex];
  const ActiveScreen = activeScreen.Screen;

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltX.set(y * 7);
    tiltY.set(x * -9);
  }

  function resetTilt() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <div
      data-hero-phone
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      className="relative flex h-full min-h-0 items-center justify-center"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={activeScreen.id}
          className="absolute left-1/2 top-1/2 h-[72%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[82px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          style={{ background: activeScreen.accent }}
        />
      </AnimatePresence>

      <motion.div
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        className="relative -top-3 z-10 w-[140px] min-[360px]:w-[160px] sm:top-0 sm:w-[190px] lg:w-[min(29vw,39svh)]"
      >
        <div
          className="absolute -inset-4 -z-10 rounded-[54px] opacity-70 blur-2xl"
          style={{ background: `radial-gradient(circle, ${activeScreen.accent}, transparent 68%)` }}
        />
        <PhoneFrame size="hero" decorative={false}>
          <div className="app-screen relative h-full w-full bg-black" aria-label="Interactive Lessgo app preview">
            <AnimatePresence initial={false}>
              <motion.div
                key={activeScreen.id}
                data-hero-screen={activeScreen.id}
                aria-hidden="true"
                className="absolute inset-0"
                initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -18, scale: 1.015 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <ActiveScreen />
              </motion.div>
            </AnimatePresence>
            <HeroPhoneDock activeIndex={activeIndex} onSelect={setActiveIndex} />
          </div>
        </PhoneFrame>
      </motion.div>
      <span className="sr-only" aria-live="polite">{activeScreen.tab} preview selected</span>
    </div>
  );
}

function ProductIntro({ reduceMotion }: { reduceMotion: boolean }) {
  const entrance = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative isolate h-[calc(100svh-2rem)] min-h-[720px] max-h-[940px] overflow-hidden border-b border-line lg:min-h-[640px]">
      <BrandWave reduceMotion={reduceMotion} />
      <GlowIcons at="52% 40%" size={920} opacity={0.22} color="var(--brand-gradient)" className="-z-20" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 58%, transparent 100%)', opacity: 0.34 }}
      />

      <Container className="relative z-10 h-full px-5 pb-3 pt-[88px]">
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-2 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:grid-rows-1 lg:gap-8">
          <div data-hero-copy className="relative z-20 self-center text-center lg:text-left">
            <motion.div
              {...entrance(0)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-ink-muted backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-events animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-events" />
              </span>
              {hero.eyebrow}
            </motion.div>

            <motion.h1
              {...entrance(0.06)}
              className="mt-6 text-[2.75rem] font-extrabold leading-[1.02] sm:text-[3.5rem] lg:text-[4rem]"
            >
              {hero.headlineLead}
              <br />
              <span className="text-gradient">{hero.headlineAccent}</span>
            </motion.h1>

            <motion.p
              {...entrance(0.12)}
              className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg lg:mx-0"
            >
              {hero.subhead}
            </motion.p>

            <motion.div
              {...entrance(0.18)}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
            >
              <CtaButton href="/download" size="lg" location="hero">
                {hero.primaryCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </CtaButton>
              <ButtonLink href="/#how-it-works" variant="secondary" size="lg">
                {hero.secondaryCta}
              </ButtonLink>
            </motion.div>

            <motion.ul
              {...entrance(0.24)}
              className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2.5 lg:justify-start"
            >
              {hero.trust.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <Check className="h-4 w-4 shrink-0 text-split" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>

          <HeroPhoneShowcase reduceMotion={reduceMotion} />
        </div>
      </Container>
    </section>
  );
}

function StoryIntroduction() {
  return (
    <section className="relative isolate overflow-hidden bg-bg-elev py-20 sm:py-28">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(115deg, transparent 15%, color-mix(in oklab, var(--events) 8%, transparent) 45%, color-mix(in oklab, var(--vibes) 9%, transparent) 70%, transparent 92%)',
        }}
      />
      <Container>
        <p className="font-mono text-xs font-bold uppercase text-ink-muted">
          {productStory.tour.eyebrow}
        </p>
        <h2 className="mt-5 max-w-4xl text-[2.6rem] font-extrabold leading-[0.98] sm:text-[4rem] lg:text-[5.4rem]">
          {productStory.tour.title}
        </h2>
        <div className="mt-8 grid max-w-5xl gap-6 border-t border-line pt-6 md:grid-cols-[1fr_1.1fr]">
          <p className="text-lg font-semibold text-ink">{productStory.tour.lead}</p>
          <p className="max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            {productStory.tour.body}
          </p>
        </div>
      </Container>
    </section>
  );
}

function StaticStory() {
  return (
    <section id="features" aria-label={productStory.tour.progressLabel}>
      {CHAPTERS.map((chapter, index) => {
        const Screen = chapter.Screen;

        return (
          <article
            key={chapter.id}
            className="relative isolate overflow-hidden border-t border-line py-16 sm:py-24"
            style={{
              background: `linear-gradient(145deg, ${chapter.tint}, var(--bg) 56%)`,
            }}
          >
            <Container>
              <div className="grid items-center gap-12 md:grid-cols-2">
                <div>
                  <p className="font-mono text-xs font-bold uppercase" style={{ color: chapter.accent }}>
                    {productStory.tour.chapterLabel} {String(index + 1).padStart(2, '0')} · {chapter.tab}
                  </p>
                  <h3 className="mt-5 text-[2.2rem] font-bold leading-[1.02] sm:text-[3rem]">
                    {chapter.headline}
                  </h3>
                  <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">{chapter.body}</p>
                </div>
                <PhoneFrame
                  className="mx-auto w-[230px] sm:w-[280px]"
                  glow={`radial-gradient(circle, ${chapter.accent}, transparent 68%)`}
                >
                  <Screen />
                </PhoneFrame>
              </div>
            </Container>
          </article>
        );
      })}
    </section>
  );
}

function StoryChapterCopy({ chapter, index }: { chapter: (typeof CHAPTERS)[number]; index: number }) {
  return (
    <article aria-hidden="true" className="max-w-xl">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[0.68rem] font-bold uppercase sm:text-xs" style={{ color: chapter.accent }}>
          {productStory.tour.chapterLabel} {String(index + 1).padStart(2, '0')}
        </span>
        <span className="h-px w-10" style={{ background: chapter.accent }} />
        <span className="text-xs font-semibold text-ink-muted">{chapter.tab}</span>
      </div>

      <h3 className="mt-3 text-[1.55rem] font-extrabold leading-[1.02] sm:mt-4 sm:text-[2.5rem] md:mt-6 lg:text-[3.25rem] xl:text-[3.8rem]">
        {chapter.headline}
      </h3>
      <p className="mt-3 max-w-lg text-[0.82rem] leading-[1.5] text-ink-muted sm:mt-4 sm:text-base sm:leading-relaxed lg:mt-6 lg:text-lg">
        {chapter.body}
      </p>

      <ul className="mt-7 hidden grid-cols-1 gap-3 lg:grid">
        {chapter.points.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm text-ink-muted">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ background: chapter.tint }}
            >
              <Check
                className="h-3 w-3"
                strokeWidth={3}
                style={{ color: chapter.accent }}
                aria-hidden="true"
              />
            </span>
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}

function StickyStory() {
  const storyRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isMobileStory = useSyncExternalStore(
    subscribeToMobileStory,
    getMobileStorySnapshot,
    getMobileStoryServerSnapshot,
  );
  const storyProgress = useMotionValue(0);
  const smoothProgress = useSpring(storyProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.45,
    restDelta: 0.001,
  });

  useEffect(() => {
    const updateStory = () => {
      const story = storyRef.current;
      const sticky = story?.querySelector<HTMLElement>('[data-story-sticky]');
      if (!story || !sticky) return;

      const stickyOffset = Number.parseFloat(getComputedStyle(sticky).top) || 0;
      const rect = story.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight + stickyOffset);
      const progress = Math.min(1, Math.max(0, (stickyOffset - rect.top) / travel));
      const nextIndex = Math.min(CHAPTERS.length - 1, Math.floor(progress * CHAPTERS.length));

      storyProgress.set(progress);
      setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
    };

    updateStory();
    window.addEventListener('scroll', updateStory, { passive: true });
    window.addEventListener('resize', updateStory);

    return () => {
      window.removeEventListener('scroll', updateStory);
      window.removeEventListener('resize', updateStory);
    };
  }, [storyProgress]);

  const activeChapter = CHAPTERS[activeIndex];
  const ActiveScreen = activeChapter.Screen;
  const storyStyle = {
    height: `${CHAPTERS.length * 100 + 40}svh`,
    '--story-accent': activeChapter.accent,
    '--story-tint': activeChapter.tint,
    '--story-on-accent': activeChapter.onAccent,
  } as CSSProperties;
  const backdropStyle = {
    background: `
      radial-gradient(ellipse 66% 70% at 76% 48%, color-mix(in oklab, ${activeChapter.accent} 24%, transparent), transparent 68%),
      linear-gradient(145deg, color-mix(in oklab, ${activeChapter.accent} 7%, var(--bg)) 0%, var(--bg) 48%, color-mix(in oklab, ${activeChapter.accent} 5%, var(--bg)) 100%)
    `,
  };

  return (
    <section
      id="features"
      ref={storyRef}
      data-story-active={activeChapter.id}
      aria-label={productStory.tour.progressLabel}
      className="relative isolate"
      style={storyStyle}
    >
      <div data-story-sticky className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden bg-bg">
        {isMobileStory ? (
          <div
            key={activeChapter.id}
            data-story-backdrop={activeChapter.id}
            className="absolute inset-0 -z-30"
            style={backdropStyle}
          />
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              key={activeChapter.id}
              data-story-backdrop={activeChapter.id}
              className="absolute inset-0 -z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={backdropStyle}
            />
          </AnimatePresence>
        )}

        <div
          className="absolute inset-0 -z-20 opacity-55"
          style={{
            backgroundImage:
              'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
            backgroundSize: '88px 88px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 74% 50%, black, transparent 74%)',
          }}
        />
        <div
          className="absolute inset-x-[8%] top-1/2 -z-10 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklab, var(--story-accent) 56%, transparent), transparent)',
          }}
        />

        <Container className="relative h-full">
          <div className="grid h-full grid-rows-[360px_minmax(0,1fr)] items-center gap-2 pb-12 pt-3 min-[360px]:grid-rows-[410px_minmax(0,1fr)] md:grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)] md:grid-rows-1 md:gap-12 md:pb-16 md:pt-10 lg:gap-20">
            <div className="relative -top-3 order-2 h-full min-h-0 self-start md:top-0 md:order-1 md:self-stretch">
              {isMobileStory ? (
                <div
                  key={activeChapter.id}
                  data-story-chapter={activeChapter.id}
                  className="absolute inset-0 flex items-start md:items-center"
                >
                  <StoryChapterCopy chapter={activeChapter} index={activeIndex} />
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <motion.div
                    key={activeChapter.id}
                    data-story-chapter={activeChapter.id}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -22 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex items-start md:items-center"
                  >
                    <StoryChapterCopy chapter={activeChapter} index={activeIndex} />
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <div className="order-1 flex h-full min-h-0 items-center justify-center md:order-2">
              <div className="relative flex h-full max-h-[500px] w-full items-center justify-center md:max-h-[680px]">
                <div
                  className="absolute left-1/2 top-1/2 h-[72%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[78px]"
                  style={{ background: activeChapter.accent, opacity: 0.16 }}
                />
                <div
                  className="absolute bottom-[8%] left-1/2 h-[10%] w-[62%] -translate-x-1/2 rounded-[50%] blur-2xl"
                  style={{ background: activeChapter.accent, opacity: 0.32 }}
                />

                <PhoneFrame
                  className="w-[190px] min-[360px]:w-[210px] sm:w-[225px] md:w-[270px] lg:w-[300px]"
                  glow={`radial-gradient(circle, ${activeChapter.accent}, transparent 68%)`}
                >
                  <div className="relative h-full w-full" style={{ background: 'var(--bg)' }}>
                    {isMobileStory ? (
                      <div
                        key={activeChapter.id}
                        data-story-screen={activeChapter.id}
                        className="absolute inset-0"
                      >
                        <ActiveScreen />
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        <motion.div
                          key={activeChapter.id}
                          data-story-screen={activeChapter.id}
                          className="absolute inset-0"
                          initial={{ opacity: 0, y: 24, scale: 0.975 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 1.015 }}
                          transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <ActiveScreen />
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </PhoneFrame>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-5 bottom-2 md:inset-x-8 md:bottom-5">
            <div className="relative h-px overflow-hidden bg-line">
              <motion.div
                className="absolute inset-y-0 left-0 w-full origin-left"
                style={{ background: 'var(--story-accent)', scaleX: smoothProgress }}
              />
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2" aria-hidden="true">
              {CHAPTERS.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase transition-opacity duration-300 sm:text-[0.68rem]"
                  style={{
                    color: index === activeIndex ? activeChapter.accent : 'var(--ink-muted)',
                    opacity: index === activeIndex ? 1 : 0.45,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: index === activeIndex ? activeChapter.accent : 'var(--line-strong)' }}
                  />
                  <span className="hidden truncate sm:inline">{chapter.tab}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>

      <ol className="sr-only">
        {CHAPTERS.map((chapter) => (
          <li key={chapter.id}>
            <h3>{chapter.headline}</h3>
            <p>{chapter.body}</p>
            <ul>
              {chapter.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ProductStory() {
  const reduceMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  return (
    <>
      <ProductIntro reduceMotion={reduceMotion} />
      <StoryIntroduction />
      {reduceMotion ? <StaticStory /> : <StickyStory />}
    </>
  );
}