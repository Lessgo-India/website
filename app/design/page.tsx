import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Bell,
  Bike,
  BookOpen,
  CakeSlice,
  CalendarDays,
  Camera,
  Check,
  CircleAlert,
  CircleCheck,
  Clapperboard,
  Coffee,
  Compass,
  Gamepad2,
  Gift,
  Heart,
  House,
  Image,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Mic2,
  Music2,
  PawPrint,
  Pencil,
  Plane,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Trees,
  Trophy,
  UserRound,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
  Wine,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '@ui/Logo';
import { ThemeToggle } from '@ui/ThemeToggle';
import { site } from '@content/site';
import {
  brandAccent,
  brandGlow,
  brandStops,
  domainPalettes,
  eventCategories,
  groupSectionAccents,
  radiusScale,
  spacingScale,
  splashSpectrum,
  statusGradients,
  statusSolids,
  typographyScale,
  vibeGradients,
} from './design-tokens';
import { PlatformGuide } from './platform-guide';
import styles from './style-guide.module.css';

export const metadata: Metadata = {
  title: 'Design system',
  description:
    'The Lessgo product design system: brand, color, typography, iconography, components, layout, motion and voice.',
  alternates: { canonical: 'https://design.lessgo.in' },
  openGraph: {
    title: 'Lessgo Design System',
    description:
      'The shared visual language behind every Lessgo event, group, split and vibe.',
    url: 'https://design.lessgo.in',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

const sections = [
  { href: '#brand', label: 'Brand' },
  { href: '#color', label: 'Color' },
  { href: '#creative-color', label: 'Creative color' },
  { href: '#typography', label: 'Typography' },
  { href: '#iconography', label: 'Iconography' },
  { href: '#components', label: 'Components' },
  { href: '#layout', label: 'Layout' },
  { href: '#motion', label: 'Motion' },
  { href: '#voice', label: 'Voice & copy' },
  { href: '#accessibility', label: 'Accessibility' },
] as const;

const navigationIcons: {
  label: string;
  websiteToken: string;
  mobileToken: string;
  Icon: LucideIcon;
  color: string;
}[] = [
  { label: 'Events', websiteToken: 'calendar-days', mobileToken: 'event', Icon: CalendarDays, color: 'var(--events)' },
  { label: 'Groups', websiteToken: 'users-round', mobileToken: 'groups', Icon: UsersRound, color: 'var(--groups)' },
  { label: 'Split', websiteToken: 'wallet-cards', mobileToken: 'account-balance-wallet', Icon: WalletCards, color: 'var(--split)' },
  { label: 'Vibes', websiteToken: 'sparkles', mobileToken: 'auto-awesome', Icon: Sparkles, color: 'var(--vibes)' },
  { label: 'Profile', websiteToken: 'user-round', mobileToken: 'person', Icon: UserRound, color: 'var(--profile)' },
];

const actionIcons: {
  label: string;
  websiteToken: string;
  mobileToken: string;
  Icon: LucideIcon;
}[] = [
  { label: 'Home', websiteToken: 'house', mobileToken: 'home', Icon: House },
  { label: 'Search', websiteToken: 'search', mobileToken: 'search', Icon: Search },
  { label: 'Add', websiteToken: 'plus', mobileToken: 'add-circle', Icon: Plus },
  { label: 'Notifications', websiteToken: 'bell', mobileToken: 'notifications', Icon: Bell },
  { label: 'Edit', websiteToken: 'pencil', mobileToken: 'edit', Icon: Pencil },
  { label: 'Share', websiteToken: 'share-2', mobileToken: 'share', Icon: Share2 },
  { label: 'Message', websiteToken: 'message-circle', mobileToken: 'chat', Icon: MessageCircle },
  { label: 'Media', websiteToken: 'image', mobileToken: 'image', Icon: Image },
  { label: 'Private', websiteToken: 'lock-keyhole', mobileToken: 'lock', Icon: LockKeyhole },
  { label: 'Close', websiteToken: 'x', mobileToken: 'close', Icon: X },
];

const launchIcons: { label: string; token: string; Icon: LucideIcon }[] = [
  { label: 'Music', token: 'music', Icon: Music2 },
  { label: 'Location', token: 'map-marker', Icon: MapPin },
  { label: 'Travel', token: 'plane', Icon: Plane },
  { label: 'Gift', token: 'gift', Icon: Gift },
  { label: 'Ticket', token: 'ticket', Icon: Ticket },
  { label: 'Drinks', token: 'glass', Icon: Wine },
  { label: 'Movie', token: 'film', Icon: Clapperboard },
  { label: 'Camera', token: 'camera', Icon: Camera },
  { label: 'Birthday', token: 'birthday-cake', Icon: CakeSlice },
  { label: 'Food', token: 'cutlery', Icon: UtensilsCrossed },
  { label: 'Cycling', token: 'bicycle', Icon: Bike },
  { label: 'Friends', token: 'users', Icon: UsersRound },
  { label: 'Coffee', token: 'coffee', Icon: Coffee },
  { label: 'Favourite', token: 'star-o', Icon: Star },
  { label: 'Love', token: 'heart-o', Icon: Heart },
  { label: 'Live', token: 'microphone', Icon: Mic2 },
  { label: 'Win', token: 'trophy', Icon: Trophy },
  { label: 'Gaming', token: 'gamepad', Icon: Gamepad2 },
  { label: 'Study', token: 'book', Icon: BookOpen },
  { label: 'Explore', token: 'compass', Icon: Compass },
  { label: 'Outdoors', token: 'tree', Icon: Trees },
  { label: 'Pets', token: 'paw', Icon: PawPrint },
  { label: 'Shopping', token: 'shopping-bag', Icon: ShoppingBag },
];

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.sectionIndex}>{index}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function TokenSwatch({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className={styles.swatch}>
      <span className={styles.swatchBackdrop} aria-hidden="true">
        <span className={styles.swatchColor} style={{ background: value }} />
      </span>
      <span className={styles.swatchMeta}>
        <strong>{label}</strong>
        <code>{value}</code>
        {note ? <small>{note}</small> : null}
      </span>
    </article>
  );
}

function PaletteCard({
  mode,
  palette,
}: {
  mode: 'Light' | 'Dark';
  palette: (typeof domainPalettes)[number]['light' | 'dark'];
}) {
  return (
    <div
      className={styles.paletteCard}
      style={{
        '--palette-bg': palette.bg,
        '--palette-surface': palette.surface,
        '--palette-surface-2': palette.surface2,
        '--palette-ink': palette.ink,
        '--palette-muted': palette.muted,
        '--palette-accent': palette.accent,
        '--palette-accent-2': palette.accent2,
        '--palette-on-accent': palette.onAccent,
      } as CSSProperties}
    >
      <div className={styles.paletteCardHeader}>
        <div>
          <span>{mode}</span>
          <code>{palette.bg}</code>
        </div>
        <span className={styles.paletteDot} aria-hidden="true" />
      </div>
      <div className={styles.paletteSample}>
        <div className={styles.paletteSampleCopy}>
          <strong>Friday plans</strong>
          <span>7 people are in</span>
        </div>
        <span className={styles.paletteAction}>Join</span>
      </div>
      <div className={styles.paletteTokens}>
        <span><i style={{ background: palette.surface }} />Surface <code>{palette.surface}</code></span>
        <span><i style={{ background: palette.ink }} />Ink <code>{palette.ink}</code></span>
        <span><i style={{ background: palette.accent }} />Accent <code>{palette.accent}</code></span>
        <span><i style={{ background: palette.accent2 }} />Secondary <code>{palette.accent2}</code></span>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <Logo />
            <span className={styles.headerDivider} aria-hidden="true" />
            <span className={styles.headerTitle}>Design system</span>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.version}>System 1.0.51</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="content">
        <PlatformGuide>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Lessgo product language</span>
            <h1>
              Make getting together feel <span className="text-gradient">effortless.</span>
            </h1>
            <p>
              <span className={`${styles.websiteOnly} ${styles.sourceList}`}>
                The complete visual and interaction reference for Lessgo on the web—from
                responsive foundations to keyboard-ready components.
              </span>
              <span className={`${styles.mobileOnly} ${styles.sourceList}`}>
                The complete visual and interaction reference for the Lessgo mobile
                experience—from touch-first controls to native motion.
              </span>
            </p>
            <div className={styles.heroStats}>
              <span><strong>5</strong> product domains</span>
              <span><strong>3</strong> typefaces</span>
              <span><strong>8 px</strong> rhythm</span>
              <span><strong>2</strong> color modes</span>
            </div>
          </div>
          <div className={styles.heroMark} aria-label="Lessgo app mark on the brand gradient">
            <div className={styles.heroMarkOrb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.logo} alt="Lessgo" width={132} height={132} />
            </div>
            <span>Party is on you.<br />Managing is on us.</span>
          </div>
        </section>

        <div className={styles.catalogue}>
          <aside className={styles.sidebar}>
            <span className={styles.sidebarLabel}>On this page</span>
            <nav aria-label="Design system sections">
              {sections.map((section, index) => (
                <a key={section.href} href={section.href}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className={styles.content}>
            <section id="brand" className={styles.guideSection}>
              <SectionHeading
                index="01"
                title="Brand"
                description="Optimistic energy with practical clarity. The identity should feel social, capable and alive—not loud for its own sake."
              />

              <div className={styles.brandGrid}>
                <article className={styles.brandMarkCard}>
                  <span className={styles.cardEyebrow}>Primary mark</span>
                  <div className={styles.markStage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={site.logo} alt="Lessgo app mark" width={112} height={112} />
                  </div>
                  <p>Keep clear space equal to one quarter of the mark. Never recolor or distort it.</p>
                </article>
                <article className={styles.wordmarkCard}>
                  <span className={styles.cardEyebrow}>Wordmark</span>
                  <div className={styles.wordmark}>
                    Less<span>go</span>
                  </div>
                  <p>Outfit ExtraBold. Use the full wordmark when brand recognition matters.</p>
                </article>
                <article className={styles.gradientCard}>
                  <span className={styles.cardEyebrow}>Signature gradient</span>
                  <div className={styles.gradientBand} />
                  <p>Sky → Indigo → Magenta. Reserve it for branded moments, not routine UI.</p>
                </article>
              </div>

              <div className={styles.principleGrid}>
                {[
                  ['Human first', 'Write and design around the people making the plan, not the system managing it.'],
                  ['One obvious next step', 'Every state should make the primary action easy to find and easy to understand.'],
                  ['Color has a job', 'Domain color creates orientation. Semantic color communicates status. Never swap the two.'],
                  ['Joy in the edges', 'Celebration, glow and motion support the moment without slowing the task down.'],
                ].map(([title, copy], index) => (
                  <article key={title} className={styles.principle}>
                    <span>0{index + 1}</span>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="color" className={styles.guideSection}>
              <SectionHeading
                index="02"
                title="Color"
                description="Five domain palettes give the product orientation. Each palette owns its own surfaces, ink and accent in light and dark mode."
              />

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Core brand</h3>
                    <p>The app-icon gradient and its two supporting solids.</p>
                  </div>
                  <code>
                    <span className={styles.websiteOnly}>app/globals.css</span>
                    <span className={styles.mobileOnly}>constants/theme.ts</span>
                  </code>
                </div>
                <div className={styles.swatchGrid}>
                  {brandStops.map((stop) => (
                    <TokenSwatch key={stop.name} label={stop.name} value={stop.value} note="Gradient stop" />
                  ))}
                  <TokenSwatch label="Brand accent" value={brandAccent} note="Links and highlights" />
                  <TokenSwatch label="Brand glow" value={brandGlow} note="Halo and ambient light" />
                </div>
                <div className={styles.spectrumCard}>
                  <div>
                    <span>Launch spectrum · light</span>
                    <code>Accessible on white</code>
                  </div>
                  <div className={styles.spectrum}>
                    {splashSpectrum.light.map((color) => (
                      <i key={color} style={{ background: color }} title={color} />
                    ))}
                  </div>
                  <div>
                    <span>Launch spectrum · dark</span>
                    <code>Luminous on black</code>
                  </div>
                  <div className={styles.spectrum}>
                    {splashSpectrum.dark.map((color) => (
                      <i key={color} style={{ background: color }} title={color} />
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Product domains</h3>
                    <p>Use the assigned domain—not a favourite color—to orient the experience.</p>
                  </div>
                  <span className={styles.countBadge}>5 palettes × 2 modes</span>
                </div>
                <div className={styles.domainList}>
                  {domainPalettes.map((domain, index) => (
                    <article key={domain.name} className={styles.domainRow}>
                      <div className={styles.domainIntro}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <h3>{domain.name}</h3>
                        <p>{domain.purpose}</p>
                      </div>
                      <PaletteCard mode="Light" palette={domain.light} />
                      <PaletteCard mode="Dark" palette={domain.dark} />
                    </article>
                  ))}
                </div>
              </div>

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Event category tints</h3>
                    <p>Fixed, theme-independent identifiers for event chips and badges.</p>
                  </div>
                  <span className={styles.countBadge}>{eventCategories.length} categories</span>
                </div>
                <div className={styles.categoryGrid}>
                  {eventCategories.map((category) => (
                    <article
                      key={category.label}
                      className={styles.categoryChip}
                      style={{ '--category': category.tint } as CSSProperties}
                    >
                      <span>{category.emoji}</span>
                      <div>
                        <strong>{category.label}</strong>
                        <code>{category.tint}</code>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="creative-color" className={styles.guideSection}>
              <SectionHeading
                index="03"
                title="Creative color"
                description="Expressive palettes make Vibes and group spaces distinctive. They are content color, never substitutes for semantic feedback."
              />

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Vibe identities</h3>
                    <p>Each canonical Vibe keeps the same visual identity in both themes.</p>
                  </div>
                  <span className={styles.countBadge}>{vibeGradients.length} signatures</span>
                </div>
                <div className={styles.vibeGrid}>
                  {vibeGradients.map((vibe) => (
                    <article
                      key={vibe.label}
                      className={styles.vibeCard}
                      style={{
                        background: `linear-gradient(135deg, ${vibe.colors.join(', ')})`,
                        '--vibe-glow': vibe.glow,
                      } as CSSProperties}
                    >
                      <Sparkles aria-hidden="true" />
                      <div>
                        <strong>{vibe.label}</strong>
                        <code>{vibe.colors.join(' · ')}</code>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Group section accents</h3>
                    <p>Pastel orientation inside a Group; separate from the Groups domain orange.</p>
                  </div>
                  <code>groupSectionPalettes.ts</code>
                </div>
                <div className={styles.groupAccentGrid}>
                  {groupSectionAccents.map((item) => (
                    <article key={item.label}>
                      <strong>{item.label}</strong>
                      <div>
                        <span style={{ background: item.light }}><code>{item.light}</code></span>
                        <span style={{ background: item.dark }}><code>{item.dark}</code></span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <details className={styles.library} open>
                <summary>
                  <span>
                    <strong>Vibe background library</strong>
                    <small>Persisted choices—never reorder gradient indexes.</small>
                  </span>
                  <span>{statusGradients.length} gradients · {statusSolids.length} solids</span>
                </summary>
                <div className={styles.libraryBody}>
                  <div className={styles.gradientLibrary}>
                    {statusGradients.map((gradient, index) => (
                      <article
                        key={gradient.label}
                        style={{ background: `linear-gradient(135deg, ${gradient.colors.join(', ')})` }}
                      >
                        <span>{String(index).padStart(2, '0')}</span>
                        <strong>{gradient.label}</strong>
                        <code>{gradient.colors.join(' → ')}</code>
                      </article>
                    ))}
                  </div>
                  <div className={styles.solidLibrary}>
                    {statusSolids.map((solid) => (
                      <article key={solid.label}>
                        <i style={{ background: solid.value }} />
                        <span><strong>{solid.label}</strong><code>{solid.value}</code></span>
                      </article>
                    ))}
                  </div>
                </div>
              </details>
            </section>

            <section id="typography" className={styles.guideSection}>
              <SectionHeading
                index="04"
                title="Typography"
                description="Outfit brings personality to display moments. Inter makes everyday UI effortless to scan. Space Mono keeps amounts and codes stable."
              />

              <div className={styles.typeFamilies}>
                <article>
                  <span>Display</span>
                  <strong className={styles.outfitSample}>Outfit</strong>
                  <p>Confident, rounded and friendly.</p>
                  <code>600 · 700 · 800</code>
                </article>
                <article>
                  <span>Interface</span>
                  <strong className={styles.interSample}>Inter</strong>
                  <p>Neutral, compact and readable.</p>
                  <code>400 · 500 · 600 · 700</code>
                </article>
                <article>
                  <span>Data</span>
                  <strong className={styles.monoSample}>Space Mono</strong>
                  <p>For money, codes and IDs only.</p>
                  <code>400 · 700</code>
                </article>
              </div>

              <div className={styles.typeScale}>
                {typographyScale.map((type) => (
                  <article key={type.token}>
                    <div className={styles.typeToken}>
                      <strong>{type.token}</strong>
                      <code>{type.family} {type.weight} · {type.size}/{type.lineHeight}</code>
                    </div>
                    <div
                      className={type.family === 'Space Mono' ? styles.monoSample : undefined}
                      style={{
                        fontFamily:
                          type.family === 'Outfit'
                            ? 'var(--font-display)'
                            : type.family === 'Space Mono'
                              ? 'var(--font-mono)'
                              : 'var(--font-sans)',
                        fontSize: `clamp(${Math.max(13, type.size * 0.72)}px, ${type.size / 18}vw, ${type.size}px)`,
                        lineHeight: `${type.lineHeight / type.size}`,
                        fontWeight: Number(type.weight),
                      }}
                    >
                      Plans are better together.
                    </div>
                    <p>{type.use}</p>
                  </article>
                ))}
              </div>

              <div className={styles.textRules}>
                <article>
                  <CircleCheck aria-hidden="true" />
                  <div>
                    <strong>Keep hierarchy decisive</strong>
                    <p>One display style and one heading level are usually enough for a screen.</p>
                  </div>
                </article>
                <article>
                  <CircleAlert aria-hidden="true" />
                  <div>
                    <strong>Do not use mono decoratively</strong>
                    <p>Reserve it for values that benefit from equal-width characters.</p>
                  </div>
                </article>
              </div>
            </section>

            <section id="iconography" className={styles.guideSection}>
              <SectionHeading
                index="05"
                title="Iconography"
                description={(
                  <>
                    <span className={styles.websiteOnly}>
                      Use Lucide&apos;s rounded stroke system consistently. Keep unfamiliar
                      actions paired with text and preserve clear pointer and focus states.
                    </span>
                    <span className={styles.mobileOnly}>
                      Use the native icon vocabulary consistently, preserve generous touch
                      targets and pair unfamiliar actions with text.
                    </span>
                  </>
                )}
              />

              <div className={styles.iconSystemNote}>
                <div className={styles.websiteOnly}>
                  <strong>Web library</strong>
                  <span>Lucide icons with a rounded 1.75–2 px stroke</span>
                </div>
                <div className={styles.websiteOnly}>
                  <strong>Control sizing</strong>
                  <span>18–20 px glyphs inside 40–44 px interactive targets</span>
                </div>
                <div className={`${styles.websiteOnly} ${styles.iconSystemLast}`}>
                  <strong>Interaction</strong>
                  <span>Every icon action needs hover, focus and an accessible name</span>
                </div>
                <div className={styles.mobileOnly}>
                  <strong>Product UI</strong>
                  <span>Material Icons for navigation and native product actions</span>
                </div>
                <div className={styles.mobileOnly}>
                  <strong>Shared primitives</strong>
                  <span>Feather icons where a lighter cross-platform stroke is needed</span>
                </div>
                <div className={`${styles.mobileOnly} ${styles.iconSystemLast}`}>
                  <strong>Celebration</strong>
                  <span>Font Awesome is reserved for the launch field</span>
                </div>
              </div>

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Primary navigation</h3>
                    <p>Domain color appears only in the selected or emphasized state.</p>
                  </div>
                  <code>24–32 px</code>
                </div>
                <div className={styles.navIconGrid}>
                  {navigationIcons.map(({ label, websiteToken, mobileToken, Icon, color }) => (
                    <article key={label}>
                      <span style={{ color }}><Icon aria-hidden="true" /></span>
                      <strong>{label}</strong>
                      <code>
                        <span className={styles.websiteOnly}>{websiteToken}</span>
                        <span className={styles.mobileOnly}>{mobileToken}</span>
                      </code>
                    </article>
                  ))}
                </div>
              </div>

              <div className={styles.subsection}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Common actions</h3>
                    <p>
                      <span className={styles.websiteOnly}>
                        Use visible hover and focus states even when the glyph is self-explanatory.
                      </span>
                      <span className={styles.mobileOnly}>
                        Use a 44 px minimum target even when the glyph is 20 or 24 px.
                      </span>
                    </p>
                  </div>
                  <code>
                    <span className={styles.websiteOnly}>18–20 px glyph</span>
                    <span className={styles.mobileOnly}>20–24 px glyph</span>
                  </code>
                </div>
                <div className={styles.actionIconGrid}>
                  {actionIcons.map(({ label, websiteToken, mobileToken, Icon }) => (
                    <article key={label}>
                      <span><Icon aria-hidden="true" /></span>
                      <div>
                        <strong>{label}</strong>
                        <code>
                          <span className={styles.websiteOnly}>{websiteToken}</span>
                          <span className={styles.mobileOnly}>{mobileToken}</span>
                        </code>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className={`${styles.subsection} ${styles.mobileOnly}`}>
                <div className={styles.subsectionHeading}>
                  <div>
                    <h3>Launch celebration field</h3>
                    <p>Playful event glyphs orbit the mark; never use this density in task UI.</p>
                  </div>
                  <span className={styles.countBadge}>{launchIcons.length} glyphs</span>
                </div>
                <div className={styles.launchIconGrid}>
                  {launchIcons.map(({ label, token, Icon }, index) => (
                    <article
                      key={label}
                      style={{ '--launch-color': splashSpectrum.dark[index % splashSpectrum.dark.length] } as CSSProperties}
                    >
                      <Icon aria-hidden="true" />
                      <span><strong>{label}</strong><code>{token}</code></span>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="components" className={styles.guideSection}>
              <SectionHeading
                index="06"
                title="Components"
                description={(
                  <>
                    <span className={styles.websiteOnly}>
                      Responsive controls prioritize clear hierarchy, visible interaction
                      states and comfortable pointer and keyboard use.
                    </span>
                    <span className={styles.mobileOnly}>
                      Touch-first controls use generous targets, soft cards, pill actions
                      and quiet supporting surfaces.
                    </span>
                  </>
                )}
              />

              <div className={styles.componentGrid}>
                <article className={styles.componentSpec}>
                  <div className={styles.componentHeading}>
                    <span>Buttons</span>
                    <code>
                      <span className={styles.websiteOnly}>44–48 px · radius 14</span>
                      <span className={styles.mobileOnly}>52 px · pill</span>
                    </code>
                  </div>
                  <div className={styles.buttonDemo}>
                    <button type="button" className={styles.primaryButton}>
                      Create event <ArrowRight aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.secondaryButton}>Maybe later</button>
                    <button type="button" className={styles.ghostButton}>View details</button>
                    <button type="button" className={styles.primaryButton} disabled>Unavailable</button>
                  </div>
                </article>

                <article className={styles.componentSpec}>
                  <div className={styles.componentHeading}>
                    <span>Inputs</span>
                    <code>
                      <span className={styles.websiteOnly}>48 px · radius 14</span>
                      <span className={styles.mobileOnly}>52 px · radius 20</span>
                    </code>
                  </div>
                  <div className={styles.fieldDemo}>
                    <label>
                      Event name
                      <span className={styles.inputShell}>Friday dinner</span>
                    </label>
                    <label>
                      Location
                      <span className={`${styles.inputShell} ${styles.focusedInput}`}>
                        <MapPin aria-hidden="true" /> Indiranagar
                      </span>
                    </label>
                    <label>
                      Invite code
                      <span className={`${styles.inputShell} ${styles.errorInput}`}>LG-42</span>
                      <small>Use the 6-character code from your invite.</small>
                    </label>
                  </div>
                </article>

                <article className={styles.componentSpec}>
                  <div className={styles.componentHeading}>
                    <span>Chips & status</span>
                    <code>radius 20</code>
                  </div>
                  <div className={styles.chipDemo}>
                    <span className={styles.activeChip}><Check aria-hidden="true" /> Going</span>
                    <span className={styles.neutralChip}>Maybe</span>
                    <span className={styles.positiveChip}>Settled</span>
                    <span className={styles.negativeChip}>₹640 due</span>
                  </div>
                  <div className={styles.statusRows}>
                    <span><i className={styles.successDot} />Payment received<strong>Just now</strong></span>
                    <span><i className={styles.warningDot} />2 replies pending<strong>Remind</strong></span>
                    <span><i className={styles.errorDot} />Upload failed<strong>Retry</strong></span>
                  </div>
                </article>

                <article className={styles.componentSpec}>
                  <div className={styles.componentHeading}>
                    <span>Cards</span>
                    <code>
                      <span className={styles.websiteOnly}>radius 20 · padding 24</span>
                      <span className={styles.mobileOnly}>radius 28 · padding 24</span>
                    </code>
                  </div>
                  <div className={styles.cardDemo}>
                    <div className={styles.eventCard}>
                      <span className={styles.eventDate}><strong>18</strong> OCT</span>
                      <div><strong>Sunset picnic</strong><span>Cubbon Park · 5:30 PM</span></div>
                      <span className={styles.avatarStack}><i>AK</i><i>RM</i><i>+5</i></span>
                    </div>
                    <div className={styles.glassCard}>
                      <Sparkles aria-hidden="true" />
                      <div><strong>7 people are in</strong><span>The plan is coming together.</span></div>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section id="layout" className={styles.guideSection}>
              <SectionHeading
                index="07"
                title="Layout"
                description={(
                  <>
                    <span className={styles.websiteOnly}>
                      Responsive containers and an 8 px rhythm keep wide and narrow browser
                      layouts calm, readable and predictable.
                    </span>
                    <span className={styles.mobileOnly}>
                      An 8 px rhythm and consistent screen gutters keep compact coordination
                      flows calm. Break the rhythm only for optical alignment.
                    </span>
                  </>
                )}
              />

              <div className={styles.layoutGrid}>
                <article className={styles.scaleCard}>
                  <div className={styles.componentHeading}>
                    <span>Spacing scale</span>
                    <code>4 px base</code>
                  </div>
                  <div className={styles.spacingList}>
                    {spacingScale.map((space) => (
                      <div key={space.token}>
                        <code>{space.token}</code>
                        <span style={{ width: `${space.value * 3}px` }} />
                        <strong>{space.value}px</strong>
                      </div>
                    ))}
                  </div>
                </article>
                <article className={styles.scaleCard}>
                  <div className={styles.componentHeading}>
                    <span>Radius scale</span>
                    <code>soft, never bubbly</code>
                  </div>
                  <div className={styles.radiusList}>
                    {radiusScale.map((radius) => (
                      <div key={radius.token}>
                        <span style={{ borderRadius: `${Math.min(radius.value, 999)}px` }} />
                        <div><strong>{radius.token} · {radius.value}</strong><small>{radius.use}</small></div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <div className={styles.measureGrid}>
                {[
                  ['40 px', 'Compact control'],
                  ['48 px', 'Primary control'],
                  ['24 px', 'Card padding'],
                  ['20 px', 'Card radius'],
                  ['1200 px', 'Content maximum'],
                  ['68 ch', 'Reading width'],
                ].map(([value, label]) => (
                  <article key={label} className={styles.websiteOnly}>
                    <strong>{value}</strong><span>{label}</span>
                  </article>
                ))}
                {[
                  ['44 px', 'Minimum touch target'],
                  ['52 px', 'Standard control height'],
                  ['16 px', 'Screen gutter'],
                  ['24 px', 'Card padding'],
                  ['28 px', 'Card radius'],
                  ['8 px', 'Layout rhythm'],
                ].map(([value, label]) => (
                  <article key={label} className={styles.mobileOnly}>
                    <strong>{value}</strong><span>{label}</span>
                  </article>
                ))}
              </div>
            </section>

            <section id="motion" className={styles.guideSection}>
              <SectionHeading
                index="08"
                title="Motion"
                description="Motion explains change and rewards progress. It should feel responsive first, expressive second, and always respect reduced-motion preferences."
              />

              <div className={styles.motionGrid}>
                <article>
                  <div className={styles.motionStage}>
                    <span className={styles.motionDot} />
                  </div>
                  <strong>Micro interaction</strong>
                  <code>
                    <span className={styles.websiteOnly}>160–220 ms · ease out</span>
                    <span className={styles.mobileOnly}>200–240 ms · ease out</span>
                  </code>
                  <p>
                    <span className={styles.websiteOnly}>
                      Hover, focus, disclosure and compact state changes.
                    </span>
                    <span className={styles.mobileOnly}>
                      Presses, chips and compact native state changes.
                    </span>
                  </p>
                </article>
                <article>
                  <div className={styles.motionStage}>
                    <span className={styles.motionCard} />
                  </div>
                  <strong>Surface entrance</strong>
                  <code>
                    <span className={styles.websiteOnly}>240–360 ms · ease out</span>
                    <span className={styles.mobileOnly}>300–650 ms · spring</span>
                  </code>
                  <p>
                    <span className={styles.websiteOnly}>
                      Menus, dialogs and meaningful hierarchy changes.
                    </span>
                    <span className={styles.mobileOnly}>
                      Sheets, cards and meaningful hierarchy changes.
                    </span>
                  </p>
                </article>
                <article>
                  <div className={styles.motionStage}>
                    <span className={styles.motionWave}><i /></span>
                  </div>
                  <strong>
                    <span className={styles.websiteOnly}>Page transition</span>
                    <span className={styles.mobileOnly}>Launch signature</span>
                  </strong>
                  <code>
                    <span className={styles.websiteOnly}>280–420 ms · shared axis</span>
                    <span className={styles.mobileOnly}>1,800 ms total · 1,600 ms wave</span>
                  </code>
                  <p>
                    <span className={styles.websiteOnly}>
                      Preserve context between related views without delaying navigation.
                    </span>
                    <span className={styles.mobileOnly}>
                      One branded light wave before control returns.
                    </span>
                  </p>
                </article>
              </div>

              <div className={styles.motionRule}>
                <CircleCheck aria-hidden="true" />
                <div>
                  <strong>Reduced motion is a product state, not a fallback.</strong>
                  <p>Remove travel, loops and parallax. Preserve visibility, hierarchy and the final state.</p>
                </div>
              </div>
            </section>

            <section id="voice" className={styles.guideSection}>
              <SectionHeading
                index="09"
                title="Voice & copy"
                description="Lessgo sounds like the organised friend in the group: warm, direct and useful. Never robotic, never trying too hard."
              />

              <div className={styles.voicePrinciples}>
                {[
                  ['Clear before clever', 'Say what happened and what the person can do next.'],
                  ['Short, not abrupt', 'Remove filler while keeping the sentence human.'],
                  ['Specific action labels', 'Prefer “Invite friends” over “Continue” when that is what happens.'],
                  ['Calm under pressure', 'Errors explain the issue without blame, panic or dead ends.'],
                ].map(([title, copy], index) => (
                  <article key={title}>
                    <span>{index + 1}</span>
                    <div><strong>{title}</strong><p>{copy}</p></div>
                  </article>
                ))}
              </div>

              <div className={styles.copyExamples}>
                <article className={styles.doCard}>
                  <span><CircleCheck aria-hidden="true" /> Do</span>
                  <strong>Couldn’t add Riya. Check your connection and try again.</strong>
                  <p>Plain language, named action, useful recovery.</p>
                </article>
                <article className={styles.dontCard}>
                  <span><X aria-hidden="true" /> Avoid</span>
                  <strong>Error 500: Request failed.</strong>
                  <p>Technical, impersonal and no next step.</p>
                </article>
              </div>

              <div className={styles.copyTable}>
                <div><strong>Buttons</strong><span>Sentence case, action first</span><code>Send reminder</code></div>
                <div><strong>Headings</strong><span>Short and descriptive</span><code>Who&apos;s coming?</code></div>
                <div><strong>Empty states</strong><span>Explain value, then action</span><code>No expenses yet. Add the first one.</code></div>
                <div><strong>Success</strong><span>Confirm outcome, skip celebration overload</span><code>Payment recorded</code></div>
              </div>
            </section>

            <section id="accessibility" className={styles.guideSection}>
              <SectionHeading
                index="10"
                title="Accessibility"
                description="A usable interface is the baseline. Color, type, motion and controls must work for people across vision, mobility and input preferences."
              />

              <div className={styles.accessibilityGrid}>
                {[
                  {
                    title: 'AA contrast',
                    copy: '4.5:1 for normal text and 3:1 for large text or essential UI.',
                    Icon: CircleCheck,
                    className: undefined,
                  },
                  {
                    title: 'Never color alone',
                    copy: 'Pair status color with an icon, label, shape or position.',
                    Icon: CircleAlert,
                    className: undefined,
                  },
                  {
                    title: 'Meaningful labels',
                    copy: 'Icon-only actions require accessible names that describe the result.',
                    Icon: MessageCircle,
                    className: undefined,
                  },
                  {
                    title: 'Reduced motion',
                    copy: 'Respect the system preference and preserve the final visual state.',
                    Icon: Sparkles,
                    className: undefined,
                  },
                  {
                    title: 'Visible focus',
                    copy: 'Every interactive element needs a clear keyboard focus ring.',
                    Icon: Search,
                    className: styles.websiteOnly,
                  },
                  {
                    title: 'Keyboard complete',
                    copy: 'Every flow must work without a pointer and follow a logical focus order.',
                    Icon: Check,
                    className: styles.websiteOnly,
                  },
                  {
                    title: '44 px targets',
                    copy: 'Keep controls reachable and forgiving on touch screens.',
                    Icon: Check,
                    className: styles.mobileOnly,
                  },
                  {
                    title: 'Dynamic type',
                    copy: 'Allow text to grow without clipping actions or hiding essential content.',
                    Icon: BookOpen,
                    className: styles.mobileOnly,
                  },
                ].map(({ title, copy, Icon: AccessibleIcon, className }) => {
                  return (
                    <article key={title} className={className}>
                      <AccessibleIcon aria-hidden="true" />
                      <div><strong>{title}</strong><p>{copy}</p></div>
                    </article>
                  );
                })}
              </div>
            </section>

            <footer className={styles.footer}>
              <div>
                <Logo />
                <p>
                  <span className={styles.websiteOnly}>One shared language for every web journey.</span>
                  <span className={styles.mobileOnly}>One shared language for every app journey.</span>
                </p>
              </div>
              <div>
                <span>Canonical sources</span>
                <span className={styles.websiteOnly}>
                  <code>app/globals.css</code>
                  <code>app/design/design-tokens.ts</code>
                  <code>components/</code>
                </span>
                <span className={styles.mobileOnly}>
                  <code>constants/theme.ts</code>
                  <code>constants/eventCategories.ts</code>
                  <code>constants/statusGradients.ts</code>
                </span>
              </div>
            </footer>
          </div>
        </div>
        </PlatformGuide>
      </main>
    </div>
  );
}
