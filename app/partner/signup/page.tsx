import type { Metadata } from 'next';
import PartnerSignup from '@ui/partner/PartnerSignup';

export const metadata: Metadata = {
  title: 'Apply to become a partner',
  robots: { index: false, follow: false, nocache: true },
};

export default function PartnerSignupPage() {
  return <PartnerSignup />;
}
