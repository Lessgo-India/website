import type { Metadata } from "next";
import UserReports from "@ui/admin/UserReports";

export const metadata: Metadata = {
  title: "User Reports",
};

export default function AdminReportsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 border-b border-line pb-5">
        <p className="text-xs font-bold uppercase text-vibes">Safety</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">
          User Reports
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Review account-level safety reports and record internal decisions.
        </p>
      </header>
      <UserReports />
    </div>
  );
}