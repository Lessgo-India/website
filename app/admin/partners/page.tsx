import type { Metadata } from 'next';
import PartnersDirectory from '@ui/admin/partners/PartnersDirectory';

export const metadata: Metadata = {
  title: 'Partners',
};

export default function AdminPartnersPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 border-b border-line pb-5">
        <p className="text-xs font-bold uppercase text-profile">Brand offers</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">Partners</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Onboard merchants, issue their logins and review campaigns before they reach the Vibes tray.
        </p>
      </header>
      <PartnersDirectory />
    </div>
  );
}
