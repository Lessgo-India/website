import type { Metadata } from 'next';
import PartnerAdminDetail from '@ui/admin/partners/PartnerAdminDetail';

export const metadata: Metadata = {
  title: 'Partner',
};

// Next 15+ passes route params as a promise.
type PageProps = { params: Promise<{ partnerId: string }> };

export default async function AdminPartnerPage({ params }: PageProps) {
  const { partnerId } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PartnerAdminDetail partnerId={partnerId} />
    </div>
  );
}
