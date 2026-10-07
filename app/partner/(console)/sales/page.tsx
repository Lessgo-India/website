import type { Metadata } from 'next';
import { RequirePermission } from '@ui/partner/PartnerGate';
import PartnerSales from '@ui/partner/PartnerSales';

export const metadata: Metadata = { title: 'Orders & bookings' };

export default function PartnerSalesPage() {
  return (
    <RequirePermission permission="sales" feature="sales">
      <PartnerSales />
    </RequirePermission>
  );
}
