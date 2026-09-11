"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, Gauge } from "lucide-react";

const SECTIONS = [
  { href: "/admin", label: "Operations", icon: Gauge },
  {
    href: "/admin/notifications",
    label: "Notification Centre",
    icon: BellRing,
  },
] as const;

export default function AdminSectionNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-1 border-b border-line"
    >
      {SECTIONS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
              active
                ? "border-profile text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
