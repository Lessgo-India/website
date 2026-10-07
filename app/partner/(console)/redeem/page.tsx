import type { Metadata } from 'next';
import { RequirePermission } from '@ui/partner/PartnerGate';
import RedeemConsole from '@ui/partner/RedeemConsole';

export const metadata: Metadata = { title: 'Redeem' };

export default function PartnerRedeemPage() {
  return (
    <RequirePermission permission="redeem">
      <RedeemConsole />
    </RequirePermission>
  );
}
