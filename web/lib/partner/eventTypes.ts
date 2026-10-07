/**
 * Event types a campaign can default to. Mirrors the app's
 * lessgo-react-native/constants/eventCategories.ts — the value is stored on
 * the event the user creates from the offer.
 */
export const EVENT_TYPES: readonly { value: string; label: string; emoji: string }[] = [
  { value: 'HANGOUT', label: 'Hangout', emoji: '👋' },
  { value: 'PARTY', label: 'Party', emoji: '🎉' },
  { value: 'DINNER', label: 'Meal', emoji: '🍽️' },
  { value: 'COFFEE', label: 'Coffee', emoji: '☕' },
  { value: 'DRINKS', label: 'Drinks', emoji: '🍸' },
  { value: 'MOVIE', label: 'Movie', emoji: '🎬' },
  { value: 'CONCERT', label: 'Concert', emoji: '🎵' },
  { value: 'GAMING', label: 'Game Night', emoji: '🎮' },
  { value: 'SPORTS', label: 'Sports', emoji: '⚽' },
  { value: 'FITNESS', label: 'Workout', emoji: '💪' },
  { value: 'OUTDOORS', label: 'Outdoors', emoji: '🥾' },
  { value: 'TRIP', label: 'Trip', emoji: '✈️' },
  { value: 'ROADTRIP', label: 'Road Trip', emoji: '🚗' },
  { value: 'PICNIC', label: 'Picnic', emoji: '🧺' },
  { value: 'SHOPPING', label: 'Shopping', emoji: '🛍️' },
  { value: 'FESTIVAL', label: 'Festival', emoji: '🎪' },
  { value: 'BIRTHDAY', label: 'Birthday', emoji: '🎂' },
  { value: 'GROUP_STUDY', label: 'Group Study', emoji: '📚' },
  { value: 'WORKSHOP', label: 'Workshop', emoji: '🛠️' },
  { value: 'MEETING', label: 'Meeting', emoji: '🤝' },
  { value: 'CONFERENCE', label: 'Conference', emoji: '🎤' },
  { value: 'EVENT', label: 'Event', emoji: '📅' },
  { value: 'OTHER', label: 'Other', emoji: '✨' },
];

export function eventTypeLabel(value: string): string {
  const match = EVENT_TYPES.find((type) => type.value === value);
  return match ? `${match.emoji} ${match.label}` : value;
}
