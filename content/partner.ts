export const partnerSite = {
  hero: {
    eyebrow: 'Lessgo Partner Portal',
    title: 'Bring groups to your business.',
    body: 'Turn the right offer into a plan, then see what became a visit, an order or a booking.',
    trust: ['No setup fee for pilot partners', 'Admin-reviewed campaigns', 'Built for India'],
  },
  outcomes: [
    {
      title: 'Reach people making plans',
      body: 'Target offers by city, audience and occasion instead of broadcasting to everyone.',
    },
    {
      title: 'Turn offers into group intent',
      body: 'People claim together, create the plan and bring friends along before they redeem.',
    },
    {
      title: 'See what became revenue',
      body: 'Track story views, claims, group visits, bookings, discount and gross sales.',
    },
  ],
  process: [
    {
      title: 'Submit your business details',
      body: 'Tell us where you operate, the offers you want to run and how groups can redeem.',
    },
    {
      title: 'Lessgo reviews the application',
      body: 'We check the business, GSTIN, brand fit and preferred redemption channels.',
    },
    {
      title: 'Receive your partner account',
      body: 'Approved owners receive a welcome email with their user ID, temporary password and login link.',
    },
  ],
  channels: [
    {
      key: 'in_store',
      eyebrow: 'In store',
      title: 'Counter redemption',
      body: 'Scan a rotating QR or enter the code at the outlet.',
      foot: 'Outlets + staff logins',
      color: 'var(--groups)',
    },
    {
      key: 'online_code',
      eyebrow: 'Online code',
      title: 'Checkout integration',
      body: 'Send shoppers to your site with a code verified through Lessgo.',
      foot: 'Web + app checkouts',
      color: '#22d3c5',
    },
    {
      key: 'api_booking',
      eyebrow: 'Bookings',
      title: 'Lessgo Connect',
      body: 'Let groups price and book tickets, rooms, seats or activities.',
      foot: 'Tickets + travel',
      color: 'var(--profile)',
    },
  ],
} as const;
