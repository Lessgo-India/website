import type { Metadata } from 'next';
import PartnerLogin from '@ui/partner/PartnerLogin';

export const metadata: Metadata = { title: 'Sign in' };

type PageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function PartnerLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return <PartnerLogin next={typeof next === 'string' ? next : null} />;
}
