import type { Metadata } from 'next';
import { RequirePermission } from '@ui/partner/PartnerGate';
import PartnerSettings from '@ui/partner/PartnerSettings';

export const metadata: Metadata = { title: 'Settings' };

export default function PartnerSettingsPage() {
  return (
    <RequirePermission permission="settings">
      <PartnerSettings />
    </RequirePermission>
  );
}
