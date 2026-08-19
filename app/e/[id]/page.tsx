import type { Metadata } from 'next';
import { cache } from 'react';
import { getEventPreview } from '@web/lib/api';
import { eventTypeLabel, formatEventWhen } from '@web/lib/format';
import { SITE_NAME } from '@web/lib/config';
import AppHeader from '@web/components/AppHeader';
import EventClient from '@web/components/EventClient';

type PageProps = { params: { id: string } };

// Dedupe the public preview fetch between generateMetadata and the page render.
const loadPreview = cache(async (id: string) => {
  try {
    return await getEventPreview(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const preview = await loadPreview(params.id);
  if (!preview || !preview.name) {
    return { title: 'Event', description: `View this event on ${SITE_NAME}.` };
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
  const preview = await loadPreview(params.id);
  const when = preview ? formatEventWhen(preview.startDate, preview.endDate) : '';

  return (
    <div className="min-h-screen bg-primary">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Public teaser — visible to everyone, including link-preview crawlers */}
        <section className="event-card">
          {preview?.dp_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.dp_url}
              alt={preview?.name || 'Event'}
              className="event-card-image"
            />
          ) : (
            <div className="event-card-image" />
          )}
          <div className="event-card-content space-y-2">
            {preview?.eventType ? (
              <span className="event-badge text-xs">{eventTypeLabel(preview.eventType)}</span>
            ) : null}
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              {preview?.name || 'Event'}
            </h1>
            {when ? <p className="text-secondary text-sm">{when}</p> : null}
            {preview?.locationName ? (
              <p className="text-secondary text-sm">{preview.locationName}</p>
            ) : null}
            {preview?.hostName ? (
              <p className="text-muted text-sm">Hosted by {preview.hostName}</p>
            ) : null}
          </div>
        </section>

        {/* Authenticated island: RSVP + downloads + more */}
        <EventClient id={params.id} />
      </main>
    </div>
  );
}
