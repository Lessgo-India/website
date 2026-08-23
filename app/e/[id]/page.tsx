import type { Metadata } from 'next';
import { cache } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { getEventPreview } from '@web/lib/api';
import { eventTypeLabel, formatEventWhen } from '@web/lib/format';
import { SITE_NAME } from '@web/lib/config';
import AppHeader from '@web/components/AppHeader';
import EventClient from '@web/components/EventClient';

// Next 15+ passes route params as a promise.
type PageProps = { params: Promise<{ id: string }> };

// Dedupe the public preview fetch between generateMetadata and the page render.
const loadPreview = cache(async (id: string) => {
  try {
    return await getEventPreview(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const preview = await loadPreview(id);
  // A private invite must never enter a search index — but link unfurls
  // (WhatsApp, iMessage) still need the OG tags, so only `robots` is locked.
  const robots = { index: false, follow: false };
  if (!preview || !preview.name) {
    return { title: 'Event', description: `View this event on ${SITE_NAME}.`, robots };
  }
  const when = formatEventWhen(preview.startDate, preview.endDate);
  const description =
    preview.description ||
    [when, preview.locationName].filter(Boolean).join(' · ') ||
    `An event on ${SITE_NAME}.`;
  const image = preview.dp_url || undefined;
  return {
    title: preview.name,
    description,
    robots,
    openGraph: {
      title: preview.name,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'website',
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title: preview.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;
  const preview = await loadPreview(id);
  const when = preview ? formatEventWhen(preview.startDate, preview.endDate) : '';

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <AppHeader />
      <main id="content" className="container-page max-w-2xl space-y-4 py-6 sm:py-10">
        {/* Public teaser — visible to everyone, including link-preview crawlers */}
        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          {preview?.dp_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.dp_url}
              alt=""
              className="h-48 w-full object-cover sm:h-64"
            />
          ) : (
            <div className="gradient-brand h-32 w-full opacity-80 sm:h-40" />
          )}
          <div className="space-y-2 p-6 sm:p-7">
            {preview?.eventType ? (
              <span className="inline-block rounded-full bg-events-tint px-3 py-1 text-xs font-semibold text-events">
                {eventTypeLabel(preview.eventType)}
              </span>
            ) : null}
            <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              {preview?.name || 'Event'}
            </h1>
            {when ? (
              <p className="flex items-center gap-2 text-ink-muted">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                {when}
              </p>
            ) : null}
            {preview?.locationName ? (
              <p className="flex items-center gap-2 text-ink-muted">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {preview.locationName}
              </p>
            ) : null}
            {preview?.hostName ? (
              <p className="text-sm text-ink-faint">Hosted by {preview.hostName}</p>
            ) : null}
          </div>
        </section>

        {/* Authenticated island: sign in (or sign up) and RSVP */}
        <EventClient id={id} />
      </main>
    </div>
  );
}
