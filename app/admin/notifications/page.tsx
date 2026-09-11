import type { Metadata } from "next";
import NotificationCenter from "@ui/admin/notifications/NotificationCenter";

export const metadata: Metadata = {
  title: "Notification Centre · Lessgo Admin",
};

export default function AdminNotificationsPage() {
  return <NotificationCenter />;
}
