import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PartnerOnboarding from '@ui/admin/partners/PartnerOnboarding';

export const metadata: Metadata = {
  title: 'Onboard a partner',
};

export default function AdminOnboardPartnerPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link href="/admin/partners" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Partners
      </Link>
      <header className="mb-6 mt-3 border-b border-line pb-5">
        <p className="text-xs font-bold uppercase text-profile">Brand offers</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">Onboard a partner</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Create the merchant account and its owner login. They sign in to the partner portal with the user ID and temporary
          password you issue here.
        </p>
      </header>
      <PartnerOnboarding />
    </div>
  );
}
