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

function Segmented({ p, items, active }: { p: Pal; items: string[]; active: number }) {
  return (
    <div
      className="mx-4 mb-3 flex rounded-full p-[3px]"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      {items.map((item, i) => (
        <span
          key={item}
          className="flex-1 rounded-full py-[5px] text-center text-[9.5px] font-bold"
          style={
            i === active
              ? { background: p.accent, color: p.onAccent }
              : { color: p.muted }
          }
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/* ── Events ─────────────────────────────────────────────────────────────── */

export function EventsScreen() {
  const p = palette.events;

  return (
    <ScreenShell p={p} title="Events" action="+ New">
      <Segmented p={p} items={['Upcoming', 'Past']} active={0} />

      <div className="space-y-2.5 px-4">
        {/* Featured event */}
        <div
          className="overflow-hidden rounded-[18px] border"
          style={{ background: p.surface, borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="relative h-[74px]"
            style={{ background: 'linear-gradient(120deg, #F7971E, #FF512F 55%, #DD2476)' }}
          >
            <span
              className="absolute left-2.5 top-2.5 rounded-full px-2 py-[3px] text-[8px] font-bold backdrop-blur"
              style={{ background: 'rgba(0,0,0,0.42)', color: '#fff' }}
            >
              🎉 Party
            </span>
            <span
              className="absolute right-2.5 top-2.5 rounded-full px-2 py-[3px] text-[8px] font-bold"
              style={{ background: p.accent, color: p.onAccent }}
            >
              You&apos;re going
            </span>
          </div>

          <div className="p-3">
            <p className="text-[13px] font-bold leading-tight" style={{ color: p.ink }}>
              Diya&apos;s Birthday Bash
            </p>
            <p className="mt-1 text-[9px]" style={{ color: p.muted }}>
              Sat, 22 Nov · 8:00 PM · The Terrace, Bandra
            </p>

            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex -space-x-1.5">
                {['Diya', 'Rohan', 'Meera', 'Kabir'].map((n) => (
                  <Avatar key={n} name={n} size={19} ring={p.surface} />
                ))}
                <span
                  className="inline-flex h-[19px] items-center justify-center rounded-full px-1.5 text-[7.5px] font-bold"
                  style={{ background: p.surface2, color: p.muted, boxShadow: `0 0 0 1.5px ${p.surface}` }}
                >
                  +5
                </span>
              </div>
              <span className="text-[8.5px] font-semibold" style={{ color: p.accent }}>
                8 going · 2 maybe
              </span>
            </div>
          </div>
        </div>

        {/* Secondary event */}
        <div
          className="flex items-center gap-2.5 rounded-[16px] border p-2.5"
          style={{ background: p.surface, borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] text-[15px]"
            style={{ background: 'linear-gradient(135deg, #1A2980, #26D0CE)' }}
          >
            ✈️
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-bold" style={{ color: p.ink }}>
              Goa, but make it sorted
            </p>
            <p className="text-[8.5px]" style={{ color: p.muted }}>
              Fri, 14 Nov · Anjuna
            </p>
          </div>
          <span
            className="rounded-full px-2 py-[3px] text-[8px] font-bold"
            style={{ background: 'rgba(199,240,74,0.14)', color: p.accent }}
          >
            RSVP
          </span>
        </div>

        <div
          className="flex items-center gap-2.5 rounded-[16px] border p-2.5"
          style={{ background: p.surface, borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] text-[15px]"
            style={{ background: 'linear-gradient(135deg, #11998E, #38EF7D)' }}
          >
            ⚽
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-bold" style={{ color: p.ink }}>
              Sunday football
            </p>
            <p className="text-[8.5px]" style={{ color: p.muted }}>
              Sun, 16 Nov · Turf 9
            </p>
          </div>
          <span className="text-[8px] font-bold" style={{ color: p.muted }}>
            3 going
          </span>
        </div>
      </div>

      <TabBar active="events" accent={p.accent} ink={p.ink} surface={p.surface} />
    </ScreenShell>
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

const BALANCES = [
  { name: 'Rohan', note: 'Goa stay · 3 items', amount: '+₹1,240', owes: true },
  { name: 'Meera', note: 'Dinner at Bastian', amount: '−₹380', owes: false },
  { name: 'Kabir', note: 'Cab + tickets', amount: '+₹560', owes: true },
  { name: 'Ananya', note: 'Settled', amount: '₹0', owes: null as boolean | null },
];

export function BalancesScreen() {
  const p = palette.split;

  return (
    <ScreenShell p={p} title="Balances" action="Settle">
      <div className="px-4">
        <div
          className="rounded-[18px] border p-3.5"
          style={{ background: p.surface, borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <p className="text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: p.muted }}>
            Net balance
          </p>
          <p className="mt-1 text-[26px] font-bold leading-none" style={{ color: p.accent }}>
            +₹1,420
          </p>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-[11px] px-2.5 py-2" style={{ background: p.surface2 }}>
              <p className="text-[7.5px]" style={{ color: p.muted }}>
                Owed to you
              </p>
              <p className="text-[11px] font-bold" style={{ color: p.accent }}>
                ₹1,800
              </p>
            </div>
            <div className="flex-1 rounded-[11px] px-2.5 py-2" style={{ background: p.surface2 }}>
              <p className="text-[7.5px]" style={{ color: p.muted }}>
                You owe
              </p>
              <p className="text-[11px] font-bold" style={{ color: '#FB7185' }}>
                ₹380
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {BALANCES.map((b) => (
            <div
              key={b.name}
              className="flex items-center gap-2.5 rounded-[14px] px-2.5 py-2"
              style={{ background: p.surface }}
            >
              <Avatar name={b.name} size={24} />
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-bold" style={{ color: p.ink }}>
                  {b.name}
                </p>
                <p className="truncate text-[8px]" style={{ color: p.muted }}>
                  {b.note}
                </p>
              </div>
              <span
                className="text-[10.5px] font-bold"
                style={{
                  color: b.owes === null ? p.muted : b.owes ? p.accent : '#FB7185',
                }}
              >
                {b.amount}
              </span>
            </div>
          ))}
        </div>

        <div
          className="mt-3 rounded-full py-2 text-center text-[10px] font-bold"
          style={{ background: p.accent, color: p.onAccent }}
        >
          Settle up over UPI
        </div>
      </div>

      <TabBar active="split" accent={p.accent} ink={p.ink} surface={p.surface} />
    </ScreenShell>
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
