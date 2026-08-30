/**
 * AuthArt — CSS/HTML recreations of the mobile app's auth illustrations
 * (components/auth/PhoneArt + OtpArt in lessgo-react-native). Pure div + brand
 * gradient, no images, so they stay crisp and add ~zero weight. Used above the
 * phone and OTP steps so the web onboarding reads like the app.
 */
import { Sparkles, MessageSquareText, Check } from 'lucide-react';

const DARK_PHONE = 'linear-gradient(135deg, #2a2440 0%, #141026 100%)';

/** A soft two-ring accent glow behind the illustration. */
function Glow() {
  return (
    <>
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-[168px] w-[168px] rounded-full bg-profile-tint" />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-28 w-28 rounded-full bg-profile-tint" />
      </div>
    </>
  );
}

/** Phone with an incoming-SMS bubble — for the "Enter your phone number" step. */
export function PhoneArt() {
  return (
    <div className="relative mx-auto mb-1 h-[176px] w-[200px]" aria-hidden="true">
      <Glow />

      <Sparkles className="absolute left-6 top-1.5 h-5 w-5 text-profile" />
      <Sparkles className="absolute right-6 top-7 h-3 w-3 text-events" />
      <Sparkles className="absolute bottom-5 right-6 h-3.5 w-3.5 text-vibes" />

      <div className="absolute inset-0 grid place-items-center">
        <div
          className="flex h-[158px] w-[98px] flex-col items-center rounded-[24px] border border-white/20 px-1.5 pb-2 pt-2 shadow-[0_10px_16px_rgba(0,0,0,0.28)]"
          style={{ background: DARK_PHONE, transform: 'rotate(-8deg)' }}
        >
          <div className="mb-1.5 h-[5px] w-[30px] rounded-full bg-white/25" />
          <div
            className="flex w-full flex-1 flex-col items-center justify-center gap-1.5 self-stretch overflow-hidden rounded-[17px] px-2.5"
            style={{ background: 'var(--brand-gradient)' }}
          >
            <div className="grid h-[34px] w-[46px] place-items-center rounded-[11px] bg-white/95">
              <MessageSquareText className="h-5 w-5" style={{ color: '#5e55e8' }} />
            </div>
            <div className="h-[5px] w-[42px] rounded-full bg-white/60" />
            <div className="h-[5px] w-[28px] rounded-full bg-white/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sealed envelope with a check seal — for the "Enter the code" step. */
export function OtpArt() {
  return (
    <div className="relative mx-auto mb-1 h-[176px] w-[200px]" aria-hidden="true">
      <Glow />

      <Sparkles className="absolute left-6 top-3 h-5 w-5 text-profile" />
      <Sparkles className="absolute right-6 top-7 h-3 w-3 text-events" />
      <Sparkles className="absolute bottom-6 right-7 h-3.5 w-3.5 text-vibes" />

      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative h-24 w-[136px] overflow-hidden rounded-2xl shadow-[0_10px_16px_rgba(0,0,0,0.26)]"
          style={{ background: 'var(--brand-gradient)', transform: 'rotate(-6deg)' }}
        >
          {/* Flap — a downward triangle clipped by the rounded corners. */}
          <div
            className="absolute left-0 top-0 h-0 w-0"
            style={{
              borderLeft: '68px solid transparent',
              borderRight: '68px solid transparent',
              borderTop: '54px solid rgba(255,255,255,0.18)',
            }}
          />
          <div className="absolute bottom-6 left-[18px] h-[5px] w-[46px] rounded-full bg-white/40" />
          <div className="absolute bottom-3.5 left-[18px] h-[5px] w-[30px] rounded-full bg-white/40" />
        </div>
      </div>

      {/* Check seal at the flap apex (matches the envelope tilt). */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="grid h-[34px] w-[34px] place-items-center rounded-full bg-white/95"
          style={{ transform: 'rotate(-6deg)' }}
        >
          <Check className="h-[22px] w-[22px]" style={{ color: '#5e55e8' }} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
