import type { Metadata } from 'next';
import PartnerLaunch from '@ui/partner/PartnerLaunch';

export const metadata: Metadata = {
  title: 'Partner with Lessgo',
  description: 'Put offers in front of groups making plans, manage campaigns and measure visits, orders and bookings.',
  alternates: { canonical: '/partner' },
};

export default function PartnerLaunchPage() {
  return <PartnerLaunch />;
}
