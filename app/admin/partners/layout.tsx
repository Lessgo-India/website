import { notFound } from 'next/navigation';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';

// Partner onboarding ships with the partner portal: hidden in production
// builds until NEXT_PUBLIC_PARTNER_PORTAL_ENABLED=true.
export default function AdminPartnersLayout({ children }: { children: React.ReactNode }) {
  if (!PARTNER_PORTAL_CONFIG.enabled) notFound();
  return children;
}
