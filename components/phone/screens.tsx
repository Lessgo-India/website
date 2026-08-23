import type { ReactNode } from 'react';

import {
  ArrowUpDown,
  Bell,
  Bug,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  History,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  Users,
  Wallet,
  Wifi,
} from 'lucide-react';

import { site } from '@content/site';

import { Avatar, StatusBar, TabBar } from './PhoneFrame';

/**
 * App-exact dark palettes, lifted from the native app's constants/theme.ts.
 * These are deliberately raw values rather than site tokens: they must track
 * the app, not the website theme.
 */
export const palette = {
  events: {
    bg: '#121110',
    surface: '#1E1B18',
    surface2: '#282420',
    ink: '#F5F2EC',
    muted: '#9A938A',
    accent: '#C7F04A',
    onAccent: '#141210',
    grad: ['#2C2A1E', '#141210'],
  },
  groups: {
    bg: '#16100C',
    surface: '#231A13',
    surface2: '#2E2219',
    ink: '#F6EFE7',
    muted: '#A5968A',
    accent: '#FF9F45',
    onAccent: '#1A1206',
    grad: ['#3A2614', '#16100C'],
  },
  split: {
    bg: '#0D140F',
    surface: '#152018',
    surface2: '#1D2C22',
    ink: '#ECF5EE',
    muted: '#8CA095',
    accent: '#4ADE80',
    onAccent: '#052E16',
    grad: ['#123A26', '#0D140F'],
  },
  vibes: {
    bg: '#15100F',
    surface: '#221816',
    surface2: '#2E211E',
    ink: '#F7ECEA',
    muted: '#A8938F',
    accent: '#FF7A7A',
    onAccent: '#1E0D0C',
    grad: ['#3A1E1B', '#15100F'],
  },
  profile: {
    bg: '#14101A',
    surface: '#1F1829',
    surface2: '#2A2138',
    ink: '#F2EDFA',
    muted: '#9C90B0',
    accent: '#C9A7FF',
    onAccent: '#17101F',
    grad: ['#2A1E3A', '#14101A'],
  },
} as const;

type Pal = (typeof palette)[keyof typeof palette];

function ScreenShell({
  p,
  title,
  action,
  children,
}: {
  p: Pal;
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${p.grad[0]} 0%, ${p.bg} 46%)`,
      }}
    >
      <StatusBar ink={p.ink} />
      <div className="flex items-center justify-between px-4 pb-3 pt-3">
        <h3 className="text-[19px] font-bold tracking-tight" style={{ color: p.ink }}>
          {title}
        </h3>
        {action ? (
          <span
            className="rounded-full px-2.5 py-1 text-[9px] font-bold"
            style={{ background: p.accent, color: p.onAccent }}
          >
            {action}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/* ── App-accurate chrome for the Events & Balances mockups ──────────────── */

const LIME = '#C7F04A';
const GREEN = '#22C55E';
const PIN = '#F9663E';
const LIVE = '#FF3B30';
const ORANGE = '#FB923C';
const PINK = '#FB7185';
const AMBER = '#F5C842';
const BUG_ORANGE = '#FB8C00';

/** iOS-style status bar: time, signal, wi-fi, battery. */
function AppStatusBar() {
  return (
    <div
      className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-semibold"
      style={{ color: 'var(--as-ink)' }}
    >
      <span>2:25</span>
      <span className="flex items-center gap-[5px]">
        <span className="flex items-end gap-[1.5px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[2.5px] rounded-[1px]" style={{ height: h, background: 'var(--as-ink)' }} />
          ))}
        </span>
        <Wifi className="h-[12px] w-[12px]" strokeWidth={2.4} />
        <span
          className="flex h-[11px] w-[20px] items-center rounded-[3px] p-[1.5px]"
          style={{ border: '1px solid var(--as-ink)' }}
        >
          <span className="h-full flex-1 rounded-[1px]" style={{ background: 'var(--as-ink)' }} />
        </span>
      </span>
    </div>
  );
}

/** App header: logo, screen title, BETA badge, and trailing icons. */
function AppHead({ title, icons }: { title: string; icons: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <div className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={site.logo} alt="" className="h-[22px] w-[22px] object-contain" />
        <span className="text-[19px] font-extrabold tracking-tight" style={{ color: 'var(--as-ink)' }}>
          {title}
        </span>
        <span
          className="ml-0.5 rounded-[5px] px-1.5 py-[1.5px] text-[7.5px] font-extrabold tracking-wide"
          style={{ background: AMBER, color: '#3a2c00' }}
        >
          BETA
        </span>
      </div>
      <div className="flex items-center gap-3.5" style={{ color: 'var(--as-ink)' }}>
        {icons}
      </div>
    </div>
  );
}

function BellBadge({ count }: { count: number }) {
  return (
    <span className="relative inline-flex">
      <Bell className="h-[17px] w-[17px]" strokeWidth={2} />
      <span
        className="absolute -right-2 -top-1.5 flex h-[13px] min-w-[13px] items-center justify-center rounded-full px-[3px] text-[7px] font-bold text-white"
        style={{ background: LIVE }}
      >
        {count}
      </span>
    </span>
  );
}

/** One event card (live or upcoming): thumbnail, host, title, time, place, RSVP. */
function EventRow({
  thumb,
  host,
  title,
  date,
  place,
  live = false,
  size = 74,
}: {
  thumb: string;
  host: string;
  title: string;
  date: string;
  place: string;
  live?: boolean;
  size?: number;
}) {
  return (
    <div className="flex gap-2.5">
      <div
        className="relative shrink-0 overflow-hidden rounded-[16px]"
        style={{ height: size, width: size, background: thumb }}
      >
        {live ? (
          <span
            className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[7px] font-bold text-white"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: LIVE }} />
            LIVE
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--as-muted)' }}>
          <User className="h-[9px] w-[9px]" strokeWidth={2.4} />
          {host}
        </span>
        <p className="mt-0.5 truncate text-[13px] font-extrabold leading-tight" style={{ color: 'var(--as-ink)' }}>
          {title}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-[9px]" style={{ color: 'var(--as-muted)' }}>
            <Clock className="h-[10px] w-[10px] shrink-0" strokeWidth={2.4} style={{ color: LIME }} />
            {date}
          </span>
          <span
            className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-[3px] text-[8.5px] font-bold"
            style={{ background: 'var(--as-accept-bg)', color: 'var(--as-pos)' }}
          >
            <CheckCircle2 className="h-[10px] w-[10px]" strokeWidth={2.4} />
            Accepted
            <ChevronDown className="h-[8px] w-[8px]" strokeWidth={2.6} />
          </span>
        </div>
        <span className="mt-1 flex items-center gap-1 text-[9px]" style={{ color: 'var(--as-muted)' }}>
          <MapPin className="h-[10px] w-[10px]" strokeWidth={2.4} style={{ color: PIN }} />
          {place}
        </span>
      </div>
    </div>
  );
}

function TabPill({ color, icon, label }: { color: string; icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full py-[5px] pl-[5px] pr-3" style={{ background: color }}>
      <span
        className="flex h-[19px] w-[19px] items-center justify-center rounded-full"
        style={{ background: 'rgba(0,0,0,0.16)' }}
      >
        {icon}
      </span>
      <span className="text-[10.5px] font-extrabold" style={{ color: '#0d1207' }}>
        {label}
      </span>
    </span>
  );
}

/** The app's expanding-pill bottom tab bar (active tab shows a labelled pill). */
function AppTab({ active }: { active: 'events' | 'balances' }) {
  return (
    <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
      <div
        className="flex items-center justify-between rounded-[24px] px-3 py-2"
        style={{ background: 'var(--as-tabbar)', border: '1px solid var(--as-tabline)' }}
      >
        <Users className="h-[19px] w-[19px]" strokeWidth={2.2} style={{ color: ORANGE }} />

        {active === 'balances' ? (
          <TabPill
            color={GREEN}
            label="Balances"
            icon={<RefreshCw className="h-[12px] w-[12px]" strokeWidth={2.6} style={{ color: '#0d1207' }} />}
          />
        ) : (
          <RefreshCw className="h-[19px] w-[19px]" strokeWidth={2.2} style={{ color: GREEN }} />
        )}

        {active === 'events' ? (
          <TabPill
            color={LIME}
            label="Events"
            icon={<Plus className="h-[13px] w-[13px]" strokeWidth={3} style={{ color: '#0d1207' }} />}
          />
        ) : (
          <Calendar className="h-[19px] w-[19px]" strokeWidth={2.2} style={{ color: LIME }} />
        )}

        <History className="h-[19px] w-[19px]" strokeWidth={2.2} style={{ color: PINK }} />

        <Avatar name="You" size={22} ring="#C9A7FF" />
      </div>
    </div>
  );
}

/** The floating bug-report button pinned above the tab bar. */
function BugFab() {
  return (
    <span
      className="absolute bottom-[70px] right-4 z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full"
      style={{ background: BUG_ORANGE, boxShadow: '0 6px 18px rgba(251,140,0,0.5)' }}
    >
      <Bug className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
    </span>
  );
}

/* ── Events ─────────────────────────────────────────────────────────────── */

export function EventsScreen() {
  return (
    <div className="app-screen relative h-full w-full overflow-hidden" style={{ background: 'var(--as-bg)' }}>
      <AppStatusBar />
      <AppHead
        title="Events"
        icons={
          <>
            <Search className="h-[17px] w-[17px]" strokeWidth={2} />
            <History className="h-[17px] w-[17px]" strokeWidth={2} />
            <BellBadge count={5} />
          </>
        }
      />

      {/* Live events */}
      <div className="flex items-center justify-between px-4 pt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: LIVE }} />
          <span className="text-[14px] font-extrabold" style={{ color: 'var(--as-ink)' }}>
            Live Events
          </span>
        </span>
        <span className="text-[9.5px]" style={{ color: 'var(--as-muted)' }}>
          5 happening now
        </span>
      </div>

      <div className="mt-2 space-y-2.5 px-4">
        <EventRow
          live
          thumb="linear-gradient(135deg,#43506a,#0e1622)"
          host="Hosted by You"
          title="Trip to Rishikesh"
          date="13 Apr, 9:00 PM…"
          place="Rishikesh"
        />
        <EventRow
          live
          thumb="linear-gradient(135deg,#2f7d43,#123a20)"
          host="Hosted by You"
          title="Testing Group link"
          date="16 Aug, 11:00 P…"
          place="Football Ground"
        />
      </div>

      {/* Upcoming events */}
      <div className="mt-3 flex items-center justify-between px-4">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-[15px] w-[15px]" strokeWidth={2.4} style={{ color: LIME }} />
          <span className="text-[14px] font-extrabold" style={{ color: 'var(--as-ink)' }}>
            Upcoming Events
          </span>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--as-faint)' }}>
            (3)
          </span>
        </span>
        <span className="flex items-center gap-3" style={{ color: LIME }}>
          <ArrowUpDown className="h-[15px] w-[15px]" strokeWidth={2.4} />
          <SlidersHorizontal className="h-[15px] w-[15px]" strokeWidth={2.4} />
        </span>
      </div>

      <div className="mt-2 space-y-2.5 px-4">
        <EventRow
          size={80}
          thumb="linear-gradient(135deg,#5fb0dd,#1f6ea8)"
          host="Hosted by You"
          title="Hangout at Lessgo bug discussio…"
          date="Today, 7:30 PM"
          place="Lessgo bug discussions"
        />
        <EventRow
          size={80}
          thumb="linear-gradient(150deg,#7b3fd4,#3a1e8a)"
          host="Hosted by Shreesh"
          title="Auto expo"
          date="31 Aug, 12:00 AM"
          place="Janta"
        />
      </div>

      <BugFab />
      <AppTab active="events" />
    </div>
  );
}

/* ── Event detail ───────────────────────────────────────────────────────── */

const ACTIONS = [
  { glyph: '📍', label: 'Meet', color: '#FF9A9A' },
  { glyph: '🎟️', label: 'Tickets', color: '#88D8D8' },
  { glyph: '🖼️', label: 'Gallery', color: '#B094DB' },
  { glyph: '💰', label: 'Split', color: '#92C7AD' },
  { glyph: '📝', label: 'Notes', color: '#E6C170' },
  { glyph: '📊', label: 'Polls', color: '#C49393' },
];

export function EventDetailScreen() {
  const p = palette.events;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: p.bg }}>
      <div
        className="relative h-[132px]"
        style={{ background: 'linear-gradient(140deg, #8E2DE2, #4A00E0 60%, #EC008C)' }}
      >
        <StatusBar ink="#fff" />
        <span
          className="absolute bottom-3 left-4 rounded-full px-2.5 py-1 text-[9px] font-bold backdrop-blur"
          style={{ background: 'rgba(0,0,0,0.38)', color: '#fff' }}
        >
          🎉 Party
        </span>
      </div>

      <div className="px-4 pt-3">
        <h3 className="text-[15px] font-bold leading-tight" style={{ color: p.ink }}>
          Diya&apos;s Birthday Bash
        </h3>
        <p className="mt-1 text-[9px]" style={{ color: p.muted }}>
          Sat, 22 Nov · 8:00 PM · The Terrace, Bandra
        </p>

        <div
          className="mt-3 flex items-center gap-2 rounded-[14px] p-2.5"
          style={{ background: p.surface }}
        >
          <Avatar name="Diya" size={26} />
          <div className="flex-1">
            <p className="text-[10px] font-bold" style={{ color: p.ink }}>
              Diya Kapoor
            </p>
            <p className="text-[8px]" style={{ color: p.muted }}>
              Host
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[8.5px] font-bold"
            style={{ background: p.accent, color: p.onAccent }}
          >
            Going ✓
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {ACTIONS.map((a) => (
            <div
              key={a.label}
              className="flex flex-col items-center gap-1 rounded-[13px] py-2.5"
              style={{ background: p.surface }}
            >
              <span className="text-[14px]">{a.glyph}</span>
              <span className="text-[7.5px] font-bold" style={{ color: a.color }}>
                {a.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {['Rohan', 'Meera', 'Kabir', 'Ishaan', 'Ananya'].map((n) => (
              <Avatar key={n} name={n} size={20} ring={p.bg} />
            ))}
          </div>
          <span className="text-[8.5px] font-semibold" style={{ color: p.accent }}>
            8 going · 2 maybe
          </span>
        </div>
      </div>

      <TabBar active="events" accent={p.accent} ink={p.ink} surface={p.surface} />
    </div>
  );
}

/* ── Balances ───────────────────────────────────────────────────────────── */

const PEOPLE = [
  { name: 'Ambuj Tripathi', amount: '+₹1528.57' },
  { name: 'Shreesh', amount: '+₹1528.57' },
  { name: 'Didi India new', amount: '+₹1428.57' },
  { name: 'Mummy', amount: '+₹1328.57' },
];

function NetSub({ label, amount, tone }: { label: string; amount: string; tone: 'pos' | 'neg' }) {
  return (
    <div className="flex-1 rounded-[14px] px-3 py-2" style={{ background: 'var(--as-net-sub)' }}>
      <span className="flex items-center gap-0.5 text-[9px]" style={{ color: 'var(--as-muted)' }}>
        {label}
        <ChevronRight className="h-[9px] w-[9px]" strokeWidth={2.4} />
      </span>
      <p
        className="mt-0.5 text-[13px] font-extrabold"
        style={{ color: tone === 'pos' ? 'var(--as-pos)' : 'var(--as-neg)' }}
      >
        {amount}
      </p>
    </div>
  );
}

export function BalancesScreen() {
  return (
    <div className="app-screen relative h-full w-full overflow-hidden" style={{ background: 'var(--as-bg)' }}>
      <AppStatusBar />
      <AppHead
        title="Balances"
        icons={
          <>
            <Search className="h-[17px] w-[17px]" strokeWidth={2} />
            <BellBadge count={5} />
          </>
        }
      />

      <div className="px-4">
        {/* Net balance */}
        <div
          className="relative overflow-hidden rounded-[22px] p-4"
          style={{ background: 'var(--as-net)', border: '1px solid var(--as-net-line)' }}
        >
          <div className="flex items-start justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--as-muted)' }}>
              Net Balance
            </span>
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
              style={{ background: 'var(--as-net-chip)' }}
            >
              <History className="h-[12px] w-[12px]" strokeWidth={2.2} style={{ color: 'var(--as-ink)' }} />
            </span>
          </div>
          <p className="mt-1 text-[29px] font-extrabold leading-none" style={{ color: 'var(--as-ink)' }}>
            +₹4619.84
          </p>
          <div className="mt-3.5 flex gap-2.5">
            <NetSub label="Owed to me" amount="₹5914.28" tone="pos" />
            <NetSub label="I owe" amount="₹1294.44" tone="neg" />
          </div>
        </div>

        {/* UPI */}
        <div
          className="mt-3 flex items-center gap-2 rounded-[14px] px-3 py-2.5"
          style={{ background: 'var(--as-card2)', border: '1px solid var(--as-line)' }}
        >
          <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[8px]"
            style={{ background: 'rgba(34,197,94,0.16)' }}
          >
            <Wallet className="h-[12px] w-[12px]" strokeWidth={2.2} style={{ color: GREEN }} />
          </span>
          <span className="text-[10px]" style={{ color: 'var(--as-muted)' }}>
            Your UPI
          </span>
          <span className="text-[10.5px] font-bold" style={{ color: 'var(--as-ink)' }}>
            9716674953@upi
          </span>
          <Copy className="ml-auto h-[13px] w-[13px]" strokeWidth={2.2} style={{ color: 'var(--as-muted)' }} />
        </div>

        {/* Filter row */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={{ background: 'var(--as-chip)', color: 'var(--as-ink)' }}
          >
            <SlidersHorizontal className="h-[12px] w-[12px]" strokeWidth={2.4} />
            All
            <ChevronDown className="h-[11px] w-[11px]" strokeWidth={2.4} />
          </span>
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full"
            style={{ background: GREEN }}
          >
            <Plus className="h-[16px] w-[16px]" strokeWidth={2.6} style={{ color: '#04160b' }} />
          </span>
        </div>

        {/* People */}
        <div className="mt-3 overflow-hidden rounded-[18px]" style={{ border: '1px solid var(--as-line)' }}>
          {PEOPLE.map((row, i) => (
            <div
              key={row.name}
              className="flex items-center gap-2.5 px-3 py-2.5"
              style={{ borderTop: i ? '1px solid var(--as-line)' : undefined }}
            >
              <Avatar name={row.name} size={30} ring="#3ddc84" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-bold" style={{ color: 'var(--as-ink)' }}>
                  {row.name}
                </p>
                <p className="text-[11px] font-bold" style={{ color: 'var(--as-pos)' }}>
                  {row.amount}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1.5 text-[10px] font-bold"
                style={{ background: 'var(--as-accept-bg)', color: 'var(--as-pos)' }}
              >
                Settle
              </span>
            </div>
          ))}
        </div>
      </div>

      <BugFab />
      <AppTab active="balances" />
    </div>
  );
}

/* ── Vibes ──────────────────────────────────────────────────────────────── */

const VIBES = [
  {
    name: 'Ishaan',
    type: '🎬 Movie',
    text: 'Anyone up for the 9pm show?',
    meta: 'PVR Phoenix · 8:30 PM',
    grad: ['#8E2DE2', '#4A00E0'],
  },
  {
    name: 'Meera',
    type: '🍽️ Food',
    text: 'Craving late-night biryani',
    meta: 'Bandra · in 2 hrs',
    grad: ['#FF512F', '#DD2476'],
  },
  {
    name: 'Kabir',
    type: '🚶 Walk',
    text: 'Marine Drive, sunset?',
    meta: 'Today · 6:00 PM',
    grad: ['#02AAB0', '#00CDAC'],
  },
];

export function VibesScreen() {
  const p = palette.vibes;

  return (
    <ScreenShell p={p} title="Vibes" action="+ Post">
      <div className="space-y-2 px-4">
        {VIBES.map((v) => (
          <div
            key={v.name}
            className="overflow-hidden rounded-[16px] p-3"
            style={{ background: `linear-gradient(135deg, ${v.grad[0]}, ${v.grad[1]})` }}
          >
            <div className="flex items-center gap-2">
              <Avatar name={v.name} size={20} ring="rgba(255,255,255,0.4)" />
              <span className="text-[10px] font-bold text-white">{v.name}</span>
              <span className="ml-auto rounded-full bg-black/25 px-1.5 py-[2px] text-[7.5px] font-bold text-white">
                {v.type}
              </span>
            </div>
            <p className="mt-2 text-[12px] font-bold leading-snug text-white">{v.text}</p>
            <p className="mt-0.5 text-[8px] text-white/75">{v.meta}</p>
            <div className="mt-2.5 flex gap-1.5">
              <span className="rounded-full bg-white px-2.5 py-[3px] text-[8px] font-bold text-black">
                I&apos;m in
              </span>
              <span className="rounded-full bg-white/22 px-2.5 py-[3px] text-[8px] font-bold text-white">
                Maybe
              </span>
              <span className="rounded-full bg-white/22 px-2.5 py-[3px] text-[8px] font-bold text-white">
                Pass
              </span>
            </div>
          </div>
        ))}
      </div>

      <TabBar active="vibes" accent={p.accent} ink={p.ink} surface={p.surface} />
    </ScreenShell>
  );
}

/* ── Groups ─────────────────────────────────────────────────────────────── */

const GROUPS = [
  { name: 'The Bandra Boys', members: 7, buzz: '3 in for tonight', grad: ['#F7971E', '#FFD200'] },
  { name: 'Flat 402', members: 4, buzz: 'Rent split pending', grad: ['#4776E6', '#8E54E9'] },
  { name: 'Trek Squad', members: 11, buzz: 'Lonavala this Sat?', grad: ['#11998E', '#38EF7D'] },
];

export function GroupsScreen() {
  const p = palette.groups;

  return (
    <ScreenShell p={p} title="Groups" action="+ New">
      <div className="px-4">
        <div
          className="rounded-[16px] border p-3"
          style={{
            background: p.surface,
            borderColor: 'rgba(255,159,69,0.28)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">⚡</span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: p.accent }}>
              Buzz · The Bandra Boys
            </span>
          </div>
          <p className="mt-1.5 text-[12px] font-bold" style={{ color: p.ink }}>
            Terrace hangout tonight?
          </p>
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex -space-x-1.5">
              {['Rohan', 'Ananya', 'Kabir'].map((n) => (
                <Avatar key={n} name={n} size={18} ring={p.surface} />
              ))}
            </div>
            <div className="flex gap-1.5">
              <span
                className="rounded-full px-2.5 py-[3px] text-[8px] font-bold"
                style={{ background: p.accent, color: p.onAccent }}
              >
                I&apos;m in
              </span>
              <span
                className="rounded-full px-2.5 py-[3px] text-[8px] font-bold"
                style={{ background: p.surface2, color: p.muted }}
              >
                Maybe
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {GROUPS.map((g) => (
            <div
              key={g.name}
              className="flex items-center gap-2.5 rounded-[14px] p-2.5"
              style={{ background: p.surface }}
            >
              <div
                className="h-[34px] w-[34px] shrink-0 rounded-[11px]"
                style={{ background: `linear-gradient(135deg, ${g.grad[0]}, ${g.grad[1]})` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold" style={{ color: p.ink }}>
                  {g.name}
                </p>
                <p className="truncate text-[8px]" style={{ color: p.muted }}>
                  {g.members} members · {g.buzz}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="groups" accent={p.accent} ink={p.ink} surface={p.surface} />
    </ScreenShell>
  );
}

/* ── Profile ────────────────────────────────────────────────────────────── */

const STATS = [
  { label: 'Events', value: '47' },
  { label: 'Hosted', value: '12' },
  { label: 'Trips', value: '6' },
  { label: 'Parties', value: '19' },
];

export function ProfileScreen() {
  const p = palette.profile;

  return (
    <ScreenShell p={p} title="Profile">
      <div className="px-4">
        <div className="flex flex-col items-center pb-1 pt-1">
          <Avatar name="Ananya" size={58} ring="rgba(201,167,255,0.45)" />
          <p className="mt-2 text-[14px] font-bold" style={{ color: p.ink }}>
            Ananya Sharma
          </p>
          <p className="text-[8.5px]" style={{ color: p.muted }}>
            Joined March 2025
          </p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-[13px] py-2.5 text-center"
              style={{ background: p.surface }}
            >
              <p className="text-[14px] font-bold leading-none" style={{ color: p.accent }}>
                {s.value}
              </p>
              <p className="mt-1 text-[7.5px]" style={{ color: p.muted }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          {[
            { glyph: '🌗', label: 'Appearance', value: 'Dark' },
            { glyph: '🔔', label: 'Notifications', value: 'On' },
            { glyph: '🔒', label: 'Data & Privacy', value: '' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-2.5 rounded-[13px] px-3 py-2.5"
              style={{ background: p.surface }}
            >
              <span className="text-[12px]">{row.glyph}</span>
              <span className="flex-1 text-[10px] font-semibold" style={{ color: p.ink }}>
                {row.label}
              </span>
              <span className="text-[9px]" style={{ color: p.muted }}>
                {row.value || '›'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="profile" accent={p.accent} ink={p.ink} surface={p.surface} />
    </ScreenShell>
  );
}

export const screens = {
  events: EventsScreen,
  eventDetail: EventDetailScreen,
  split: BalancesScreen,
  vibes: VibesScreen,
  groups: GroupsScreen,
  profile: ProfileScreen,
} as const;
