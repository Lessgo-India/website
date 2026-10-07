import type { Metadata } from 'next';
import { RequirePermission } from '@ui/partner/PartnerGate';
import PartnerOverview from '@ui/partner/PartnerOverview';

export const metadata: Metadata = { title: 'Overview' };

export default function PartnerOverviewPage() {
  return (
    <RequirePermission permission="overview">
      <PartnerOverview />
    </RequirePermission>
  );
}
