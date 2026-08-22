/**
 * Single source of truth for every user-facing string on the marketing site.
 * Nothing is hardcoded in components, so adding Hindi later is a config change
 * rather than a rewrite.
 */

export const site = {
  name: 'Lessgo',
  tagline: 'Hangouts made easy.',
  domain: 'lessgo.com',
  androidPackage: 'com.lessgo.india',
  logo: 'https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png',
  /** Flip to true the day the store listings go live. */
  storesLive: false,
} as const;

export const nav = {
  primary: [
    { label: 'Features', href: '/features' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Help', href: '/help' },
  ],
  cta: { label: 'Get early access', href: '/download' },
} as const;

export const hero = {
  eyebrow: 'Now in early access · India',
  headlineLead: 'Party is on you.',
  headlineAccent: 'Managing is on us.',
  subhead:
    'Lessgo turns group-chat chaos into one app — plan the hangout, get everyone to RSVP, split the bill, and settle up. All with the friends already in your phone.',
  primaryCta: 'Get early access',
  secondaryCta: 'See how it works',
  trust: ['Free to start', 'No ads', 'Contacts stay private', 'Made in India'],
} as const;

/** Event types the app supports, used in the marquee. */
export const eventTypes = [
  { emoji: '👋', label: 'Hangout' },
  { emoji: '✈️', label: 'Trip' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '🍽️', label: 'Meal' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '📚', label: 'Group study' },
  { emoji: '🎤', label: 'Concert' },
  { emoji: '🛠️', label: 'Workshop' },
  { emoji: '🤝', label: 'Meeting' },
  { emoji: '🎬', label: 'Movie night' },
  { emoji: '💪', label: 'Workout' },
  { emoji: '🛍️', label: 'Shopping run' },
] as const;

export const problem = {
  eyebrow: 'Sound familiar?',
  headline: 'The plan dies in the group chat.',
  body: 'Forty messages deep and nobody knows who is actually coming. Somebody paid for everything. Nobody wants to be the one to ask for the money back.',
  chaos: [
    { from: 'Ananya', text: 'guys goa this weekend??' },
    { from: 'Rohan', text: 'im in 🙌' },
    { from: 'Meera', text: 'wait which weekend' },
    { from: 'Kabir', text: 'who all confirmed' },
    { from: 'Ananya', text: 'i paid for the stay btw' },
    { from: 'Rohan', text: 'how much do i owe' },
    { from: 'Meera', text: 'so are we going or no' },
  ],
  after: {
    title: 'Goa, but make it sorted',
    when: 'Fri, 14 Nov · 7:00 AM',
    where: 'Anjuna, Goa',
    going: 6,
    maybe: 2,
    settled: 'Everyone settled up',
  },
} as const;

/**
 * The five product domains. Accent tokens mirror the app's per-tab palette,
 * so each section literally wears the colour of its tab in the app.
 */
export const features = [
  {
    id: 'events',
    domain: 'events',
    tab: 'Events',
    eyebrow: 'Plan it',
    headline: 'From “we should hang out” to a real plan.',
    body: 'Create an event, invite your people, and watch the RSVPs land. Everything the night needs — meeting points, tickets, notes, polls, photos — lives on one page.',
    quote: 'Round up your gang, pick a vibe, and make the next hangout happen.',
    points: [
      'RSVP in one tap — going, maybe, or not this time',
      'Meeting points that open straight into Maps',
      'Tickets, documents and the shared photo gallery in one place',
    ],
  },
  {
    id: 'split',
    domain: 'split',
    tab: 'Balances',
    eyebrow: 'Split it',
    headline: 'Settle up without the awkward chase.',
    body: 'Log what you spent, and Lessgo works out who owes whom. One clean balance per friend instead of a spreadsheet nobody opens.',
    quote: 'No more “bro, ₹340?” at 1am.',
    points: [
      'One net balance per person, not a pile of receipts',
      'Pay back over UPI without leaving the thread',
      'Export the whole ledger as PDF or CSV whenever you want',
    ],
  },
  {
    id: 'vibes',
    domain: 'vibes',
    tab: 'Vibes',
    eyebrow: 'Feel it',
    headline: 'Free tonight? Say it once, see who’s in.',
    body: 'Drop a vibe — movie, food, a walk, anything — and the friends in your contacts can tap in. Plans that would never survive a group chat actually happen.',
    quote: 'Spontaneous plans, minus the twenty-message warm-up.',
    points: [
      'Post a vibe in seconds, pick when it expires',
      'Friends react with in, maybe, or pass',
      'Only people already in your contacts ever see it',
    ],
  },
  {
    id: 'groups',
    domain: 'groups',
    tab: 'Groups',
    eyebrow: 'Keep it',
    headline: 'Your crews, kept together.',
    body: 'College gang, flatmates, the trip squad. Each group gets its own space for buzzes, events and a running scoreboard of who actually shows up.',
    quote: 'The people you plan with, always one tap away.',
    points: [
      'Send a Buzz to test the water before committing',
      'Every group keeps its own events and history',
      'Stats and MVPs, because someone has to be crowned',
    ],
  },
  {
    id: 'profile',
    domain: 'profile',
    tab: 'Profile',
    eyebrow: 'Own it',
    headline: 'A year of good times, counted.',
    body: 'Events attended, trips taken, parties survived, plans you hosted. Your profile keeps score so you know exactly how the year went.',
    quote: 'Proof you actually left the house.',
    points: [
      'Light and dark themes, because 2am exists',
      'Notification controls that are actually controls',
      'Delete your profile and your data, any time',
    ],
  },
] as const;

export const howItWorks = {
  eyebrow: 'Three steps',
  headline: 'Plan tonight in under a minute.',
  steps: [
    {
      n: '01',
      title: 'Start the plan',
      body: 'Pick a vibe, set a time and place, and give it a name. Ten seconds, tops.',
    },
    {
      n: '02',
      title: 'Invite your people',
      body: 'Add friends from your contacts. They get a link — no app required to say yes.',
    },
    {
      n: '03',
      title: 'Go, split, settle',
      body: 'Share photos and tickets while it happens. Add what you spent. Lessgo does the maths.',
    },
  ],
} as const;

export const shareLoop = {
  eyebrow: 'No app? No problem.',
  headline: 'Send a link. They can RSVP from the browser.',
  body: 'Every Lessgo event has a shareable web page. Your friend opens it, sees the plan, and RSVPs — no download, no account wall, no “install this first” standoff.',
  points: [
    { title: 'Works anywhere', body: 'WhatsApp, Instagram, SMS. If they can open a link, they can reply.' },
    { title: 'Real page, real preview', body: 'Cover image, time and place render right in the chat preview.' },
    { title: 'Install when they want more', body: 'Photos, splits and chat live in the app — and it’s right there when they’re ready.' },
  ],
} as const;

export const privacy = {
  eyebrow: 'The trust bit',
  headline: 'Your contacts are not our product.',
  body: 'Lessgo is built for the people already in your phone. That means we take the contacts permission seriously — and we would rather say exactly what we do with it than bury it in a policy.',
  promises: [
    {
      title: 'Contacts, only to find friends',
      body: 'We match your contacts against people already on Lessgo, so you can invite them. We never message them on your behalf.',
    },
    {
      title: 'Nothing is sold. Ever.',
      body: 'No selling contact data, no advertiser access, no third-party data brokers. It is not a business model we are interested in.',
    },
    {
      title: 'Friends-only by design',
      body: 'There is no public feed, no follower count, no strangers in your DMs. Lessgo only works inside your circle.',
    },
    {
      title: 'Leave whenever you like',
      body: 'Delete your profile from inside the app and your data goes with it. Built to India’s DPDP Act 2023.',
    },
  ],
  everyPermission: [
    { name: 'Contacts', why: 'Invite your people — and catch invites coming your way.' },
    { name: 'Notifications', why: 'Event alerts and reminders so you never miss the buzz.' },
    { name: 'Location', why: 'Pick your spots and open them right in Maps.' },
    { name: 'Gallery', why: 'Share pictures and moments with your crew.' },
    { name: 'Files', why: 'Attach tickets & documents — only the ones you pick.' },
  ],
} as const;

export const faq = [
  {
    q: 'Is Lessgo free?',
    a: 'Yes. Creating events, RSVPs, groups, vibes and expense splitting are all free, and there are no ads. If we ever add a paid tier it will be for extras, never for the basics.',
  },
  {
    q: 'Why does Lessgo need my contacts?',
    a: 'Lessgo is built around the friends you already have, so we match your contacts against people already on Lessgo to show you who you can invite. We never message your contacts on your behalf, and we never sell or share contact data. You can use the app without granting the permission — you will just have to invite people by link instead.',
  },
  {
    q: 'Do my friends need the app to RSVP?',
    a: 'No. Every event has a shareable web link. Anyone can open it in a browser, see the details and RSVP after a quick phone verification. The app unlocks the extras — photos, expense splitting, chat and notifications.',
  },
  {
    q: 'How does splitting expenses work?',
    a: 'Add what you spent to an event and pick who it was for. Lessgo works out the net balance between each pair of people, so instead of ten small debts you get one number per friend. You can settle over UPI and export the full ledger as a PDF or CSV.',
  },
  {
    q: 'Who can see my plans?',
    a: 'Only people you invite. Events are visible to their guest list, and vibes are visible only to friends already in your contacts. There is no public feed and no way for a stranger to find you.',
  },
  {
    q: 'Which platforms is Lessgo on?',
    a: 'Lessgo is a native app for Android and iOS, plus a lightweight web view for shared event links. Android and iOS builds are in early access right now — join the list and we will send you the download the moment it opens up.',
  },
  {
    q: 'Is there a minimum age?',
    a: 'Yes — you need to be at least 13 to use Lessgo, and older where local law requires it.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Open Profile, then Data & Privacy, then Delete Profile. Your account and associated data are removed. You can also write to us and we will handle it.',
  },
] as const;

export const changelog = [
  {
    version: '0.0.151',
    date: '2026-08',
    title: 'Vibes, polished',
    notes: [
      'Reworked the Vibes feed with 26 gradient backgrounds and faster posting',
      'Expiry cut-offs on vibes, from 1 hour up to 24 hours',
      'Faster event list with new sorting by event date or invite date',
    ],
  },
  {
    version: '0.0.140',
    date: '2026-07',
    title: 'Balances that add up',
    notes: [
      'Net balance per person instead of a list of individual debts',
      'Export the full ledger as PDF or CSV',
      'UPI hand-off when you settle up',
    ],
  },
  {
    version: '0.0.120',
    date: '2026-06',
    title: 'Share a plan with anyone',
    notes: [
      'Shareable event links that open in any browser',
      'Guests can RSVP without installing the app',
      'Rich link previews with cover, time and place',
    ],
  },
  {
    version: '0.0.100',
    date: '2026-05',
    title: 'Groups and Buzz',
    notes: [
      'Groups with their own events, stats and MVPs',
      'Buzz — float a hangout idea before committing to a plan',
      'Light and dark themes across every screen',
    ],
  },
] as const;

export const finalCta = {  headline: 'Your next plan is one tap away.',
  body: 'Join the early-access list and be first in when Lessgo opens up.',
  cta: 'Get early access',
  reassure: 'Free to start · No ads · Your contacts stay yours',
} as const;

export const footer = {
  blurb: 'Lessgo turns messy group chats into plans that actually happen — RSVP, split, settle, done.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/features' },
        { label: 'How it works', href: '/#how-it-works' },
        { label: 'Get the app', href: '/download' },
        { label: 'What’s new', href: '/whats-new' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help & FAQ', href: '/help' },
        { label: 'Privacy at Lessgo', href: '/#privacy' },
        { label: 'Contact us', href: 'mailto:hello@lessgo.com' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Use', href: '/terms' },
        { label: 'Grievance Officer', href: '/privacy#grievance' },
      ],
    },
  ],
  madeIn: 'Built with ❤️ in India',
} as const;

export type Feature = (typeof features)[number];
export type Domain = Feature['domain'];
