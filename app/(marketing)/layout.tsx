import { PageViewTracker } from '@ui/PageViewTracker';
import { SiteFooter } from '@ui/SiteFooter';
import { SiteHeader } from '@ui/SiteHeader';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      <SiteHeader />
      <main id="content">{children}</main>
      <SiteFooter />
    </>
  );
}
