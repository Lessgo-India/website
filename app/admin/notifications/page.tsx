import type { Metadata } from "next";
import NotificationCenter from "@ui/admin/notifications/NotificationCenter";

export const metadata: Metadata = {
  title: "Notification Centre",
};

export default function AdminNotificationsPage() {
  return <NotificationCenter />;
}
