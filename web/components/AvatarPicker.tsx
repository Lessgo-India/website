/**
 * AvatarPicker — profile-picture chooser for web onboarding. Shows the selected
 * picture (a built-in default avatar or an uploaded photo) with controls to
 * shuffle through the defaults or upload a custom image. Controlled: the parent
 * owns the current preview URL and how the picture is chosen.
 */
'use client';

import { useRef } from 'react';
import { Camera, Loader2, Shuffle, Upload } from 'lucide-react';

type Props = {
  previewUrl: string;
  onShuffle: () => void;
  onPickFile: (file: File) => void;
  busy?: boolean;
};

const chipClass =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border ' +
  'border-line-strong bg-surface px-5 text-sm font-semibold text-ink transition-transform ' +
  'duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-55';

export default function AvatarPicker({ previewUrl, onShuffle, onPickFile, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Your profile picture"
          className="h-24 w-24 rounded-full border-2 border-profile bg-surface-2 object-cover"
        />
        {busy ? (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={openPicker}
          disabled={busy}
          aria-label="Upload a photo"
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-profile-fill text-profile-on transition-transform duration-200 ease-spring active:scale-[0.97] disabled:opacity-55"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className={chipClass} disabled={busy} onClick={onShuffle}>
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          Shuffle
        </button>
        <button type="button" className={chipClass} disabled={busy} onClick={openPicker}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
