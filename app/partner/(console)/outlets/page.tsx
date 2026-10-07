import type { Metadata } from 'next';
import { RequirePermission } from '@ui/partner/PartnerGate';
import PartnerOutlets from '@ui/partner/PartnerOutlets';

export const metadata: Metadata = { title: 'Outlets' };

export default function PartnerOutletsPage() {
  return (
    <RequirePermission permission="outlets" feature="outlets">
      <PartnerOutlets />
    </RequirePermission>
  );
}
