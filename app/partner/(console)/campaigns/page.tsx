import type { Metadata } from 'next';
import CampaignList from '@ui/partner/CampaignList';
import { RequirePermission } from '@ui/partner/PartnerGate';

export const metadata: Metadata = { title: 'Campaigns' };

export default function PartnerCampaignsPage() {
  return (
    <RequirePermission permission="campaigns">
      <CampaignList />
    </RequirePermission>
  );
}
