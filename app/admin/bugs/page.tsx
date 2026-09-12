import type { Metadata } from 'next';
import BugHouse from '@ui/admin/BugHouse';

export const metadata: Metadata = {
  title: 'Bug House',
};

export default function AdminBugsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 border-b border-line pb-5">
        <p className="text-xs font-bold uppercase text-gold">Support</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
          Bug House
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Triage reports submitted from the mobile app.
        </p>
      </header>
      <BugHouse />
    </div>
  );
}
