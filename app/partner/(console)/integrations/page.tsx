import type { Metadata } from 'next';
import { RequirePermission } from '@ui/partner/PartnerGate';
import PartnerIntegrations from '@ui/partner/PartnerIntegrations';

export const metadata: Metadata = { title: 'Integrations' };

export default function PartnerIntegrationsPage() {
  return (
    <RequirePermission permission="integrations" feature="integrations">
      <PartnerIntegrations />
    </RequirePermission>
  );
}
