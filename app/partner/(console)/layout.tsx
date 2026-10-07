import PartnerGate from '@ui/partner/PartnerGate';
import PartnerShell from '@ui/partner/PartnerShell';

export default function PartnerConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartnerGate>
      <PartnerShell>{children}</PartnerShell>
    </PartnerGate>
  );
}
