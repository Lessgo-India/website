import type { Metadata } from 'next';
import AdminSettings from '@ui/admin/AdminSettings';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
