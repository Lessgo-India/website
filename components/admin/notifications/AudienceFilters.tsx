"use client";

import { Search } from "lucide-react";
import type {
  CampaignAudience,
  CampaignEvent,
} from "@web/lib/adminNotificationsApi";

const EVENT_TYPES = [
  "HANGOUT",
  "TRIP",
  "MEETING",
  "WORKSHOP",
  "PARTY",
  "SPORTS",
  "GROUP_STUDY",
  "DINNER",
  "CONFERENCE",
  "EVENT",
  "MOVIE",
  "CONCERT",
  "GAMING",
  "BIRTHDAY",
  "COFFEE",
  "DRINKS",
  "OUTDOORS",
  "PICNIC",
  "ROADTRIP",
  "SHOPPING",
  "FESTIVAL",
  "FITNESS",
  "OTHER",
] as const;

const RSVP = [
  { value: -1, label: "Declined" },
  { value: 0, label: "Maybe" },
  { value: 1, label: "Going" },
  { value: 2, label: "No response" },
] as const;

const ROLES = [
  { value: 0, label: "Host" },
  { value: 1, label: "Member" },
  { value: 2, label: "Co-host" },
] as const;

interface Props {
  audience: CampaignAudience;
  onChange: (audience: CampaignAudience) => void;
  events: CampaignEvent[];
  eventQuery: string;
  onEventQueryChange: (value: string) => void;
  onSearchEvents: () => void;
  eventsLoading: boolean;
}

export default function AudienceFilters({
  audience,
  onChange,
  events,
  eventQuery,
  onEventQueryChange,
  onSearchEvents,
  eventsLoading,
}: Props) {
  const patch = (next: Partial<CampaignAudience>) =>
    onChange({ ...audience, ...next });
  const toggle = <T extends string | number>(
    current: T[] | undefined,
    value: T,
  ): T[] =>
    current?.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...(current ?? []), value];
  const needsEvents = audience.eventMode !== "none";

  return (
    <section className="border-t border-line pt-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-ink">
          Event activity
          <select
            value={audience.eventMode}
            onChange={(event) =>
              patch({
                eventMode: event.target.value as CampaignAudience["eventMode"],
                eventId: undefined,
                anchorEventId: undefined,
              })
            }
            className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
          >
            <option value="none">No event filter</option>
            <option value="recent">Recent event activity</option>
            <option value="specific">Specific event members</option>
            <option value="near_event">Activity near an event</option>
          </select>
        </label>

        {(audience.eventMode === "recent" ||
          audience.eventMode === "near_event") && (
          <label className="space-y-2 text-sm font-semibold text-ink">
            Activity window
            <select
              value={audience.lookbackDays ?? 30}
              onChange={(event) =>
                patch({
                  lookbackDays: Number(event.target.value) as 7 | 30 | 90 | 180,
                })
              }
              className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          label="Minimum age"
          value={audience.minAge}
          onChange={(value) => patch({ minAge: value })}
        />
        <NumberField
          label="Maximum age"
          value={audience.maxAge}
          onChange={(value) => patch({ maxAge: value })}
        />
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Gender</legend>
          <div className="mt-2 flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2">
            {(["M", "F", "T"] as const).map((value) => (
              <label
                key={value}
                className="inline-flex items-center gap-2 text-sm text-ink-muted"
              >
                <input
                  type="checkbox"
                  checked={audience.genders?.includes(value) ?? false}
                  onChange={() =>
                    patch({ genders: toggle(audience.genders, value) })
                  }
                  className="h-4 w-4 accent-profile"
                />
                {value === "M"
                  ? "Male"
                  : value === "F"
                    ? "Female"
                    : "Transgender"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {needsEvents ? (
        <div className="mt-6 space-y-5 border-t border-line pt-5">
          {(audience.eventMode === "specific" ||
            audience.eventMode === "near_event") && (
            <div className="space-y-3">
              <label
                className="block text-sm font-semibold text-ink"
                htmlFor="event-search"
              >
                Find event
              </label>
              <div className="flex gap-2">
                <input
                  id="event-search"
                  value={eventQuery}
                  onChange={(event) => onEventQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearchEvents();
                    }
                  }}
                  placeholder="Search event name"
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-profile"
                />
                <button
                  type="button"
                  onClick={onSearchEvents}
                  disabled={eventsLoading}
                  title="Search events"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:bg-surface-2 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Search events</span>
                </button>
              </div>
              <label className="block space-y-2 text-sm font-semibold text-ink">
                {audience.eventMode === "specific"
                  ? "Event"
                  : "Location anchor"}
                <select
                  value={
                    audience.eventMode === "specific"
                      ? (audience.eventId ?? "")
                      : (audience.anchorEventId ?? "")
                  }
                  onChange={(event) =>
                    patch(
                      audience.eventMode === "specific"
                        ? { eventId: event.target.value || undefined }
                        : { anchorEventId: event.target.value || undefined },
                    )
                  }
                  className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
                >
                  <option value="">Select an event</option>
                  {events
                    .filter((event) =>
                      audience.eventMode === "near_event"
                        ? event.hasLocation
                        : true,
                    )
                    .map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({event.memberCount})
                        {event.locationName ? ` - ${event.locationName}` : ""}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}

          {audience.eventMode === "near_event" ? (
            <NumberField
              label="Radius in kilometres"
              value={audience.radiusKm ?? 25}
              minimum={1}
              maximum={200}
              onChange={(value) => patch({ radiusKm: value })}
            />
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <CheckGroup
              legend="Member role"
              items={ROLES}
              selected={audience.roles ?? []}
              onToggle={(value) =>
                patch({ roles: toggle(audience.roles, value) })
              }
            />
            <CheckGroup
              legend="RSVP state"
              items={RSVP}
              selected={audience.rsvpStatuses ?? []}
              onToggle={(value) =>
                patch({ rsvpStatuses: toggle(audience.rsvpStatuses, value) })
              }
            />
          </div>

          {audience.eventMode !== "specific" ? (
            <details className="border-y border-line py-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">
                Event types
                {audience.eventTypes?.length
                  ? ` (${audience.eventTypes.length})`
                  : ""}
              </summary>
              <div className="grid gap-2 pb-3 sm:grid-cols-2 lg:grid-cols-4">
                {EVENT_TYPES.map((value) => (
                  <label
                    key={value}
                    className="inline-flex min-h-9 items-center gap-2 text-sm text-ink-muted"
                  >
                    <input
                      type="checkbox"
                      checked={audience.eventTypes?.includes(value) ?? false}
                      onChange={() =>
                        patch({
                          eventTypes: toggle(audience.eventTypes, value),
                        })
                      }
                      className="h-4 w-4 accent-profile"
                    />
                    {value.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  minimum = 0,
  maximum = 120,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  minimum?: number;
  maximum?: number;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-ink">
      {label}
      <input
        type="number"
        min={minimum}
        max={maximum}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm font-normal text-ink outline-none focus:border-profile"
      />
    </label>
  );
}

function CheckGroup<T extends number>({
  legend,
  items,
  selected,
  onToggle,
}: {
  legend: string;
  items: ReadonlyArray<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {items.map((item) => (
          <label
            key={item.value}
            className="inline-flex min-h-9 items-center gap-2 text-sm text-ink-muted"
          >
            <input
              type="checkbox"
              checked={selected.includes(item.value)}
              onChange={() => onToggle(item.value)}
              className="h-4 w-4 accent-profile"
            />
            {item.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
