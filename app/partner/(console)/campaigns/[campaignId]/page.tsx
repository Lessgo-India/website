import type { Metadata } from 'next';
import CampaignDetail from '@ui/partner/CampaignDetail';
import { RequirePermission } from '@ui/partner/PartnerGate';

export const metadata: Metadata = { title: 'Campaign' };

// Next 15+ passes route params and search params as promises.
type PageProps = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ submitted?: string | string[] }>;
};

export default async function PartnerCampaignPage({ params, searchParams }: PageProps) {
  const [{ campaignId }, { submitted }] = await Promise.all([params, searchParams]);
  return (
    <RequirePermission permission="campaigns">
      <CampaignDetail campaignId={campaignId} justSubmitted={submitted === '1'} />
    </RequirePermission>
  );
}
