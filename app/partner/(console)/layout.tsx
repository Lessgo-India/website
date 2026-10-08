import type { Metadata } from 'next';
import PartnerGate from '@ui/partner/PartnerGate';
import PartnerShell from '@ui/partner/PartnerShell';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PartnerConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartnerGate>
      <PartnerShell>{children}</PartnerShell>
    </PartnerGate>
  );
}
