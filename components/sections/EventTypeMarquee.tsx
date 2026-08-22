import { eventTypes } from '@content/site';

/**
 * Infinite ticker of the event types the app supports. The list is duplicated
 * so the CSS translate loop is seamless; the duplicate is hidden from
 * assistive tech, and the whole strip is decorative reinforcement of copy
 * that already appears elsewhere.
 */
export function EventTypeMarquee() {
  const items = [...eventTypes, ...eventTypes];

  return (
    <div className="border-y border-line bg-bg-elev py-5">
      <p className="sr-only">
        Lessgo supports hangouts, trips, parties, meals, sports, group study, concerts,
        workshops, meetings, movie nights, workouts and shopping runs.
      </p>
      <div className="edge-fade overflow-hidden" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
          {items.map((item, i) => (
            <span
              key={`${item.label}-${i}`}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted"
            >
              <span aria-hidden="true">{item.emoji}</span>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
