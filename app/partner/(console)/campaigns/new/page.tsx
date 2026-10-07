import type { Metadata } from 'next';
import CampaignWizard from '@ui/partner/CampaignWizard';
import { RequirePermission } from '@ui/partner/PartnerGate';

export const metadata: Metadata = { title: 'New campaign' };

type PageProps = { searchParams: Promise<{ from?: string | string[] }> };

export default async function NewPartnerCampaignPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  return (
    <RequirePermission permission="campaigns.write">
      <CampaignWizard fromCampaignId={typeof from === 'string' ? from : null} />
    </RequirePermission>
  );
}
