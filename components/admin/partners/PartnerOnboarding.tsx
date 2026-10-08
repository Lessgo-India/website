'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, BadgeCheck, CircleCheck, Loader2, Plus, Send } from 'lucide-react';
import { BrandAvatar, ChannelBadge } from '@ui/partner/ui';
import { usePartnerQuery } from '@ui/partner/usePartnerQuery';
import { isPartnerHandleAvailable, onboardPartner, takenPartnerHandles } from '@web/lib/adminPartnersApi';
import {
  BOOKING_METHOD_DETAILS,
  BOOKING_PRODUCT_DETAILS,
  BOOKING_PRODUCTS,
  CHANNEL_DETAILS,
  REDEMPTION_CHANNELS,
} from '@web/lib/partner/channels';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { INDIA_GEO, stateName } from '@web/lib/partner/indiaGeo';
import {
  categoryDefaults,
  checkGstin,
  hasOnboardingErrors,
  PARTNER_CATEGORY_DETAILS,
  PLAN_DETAILS,
  suggestHandle,
  validateOnboarding,
  type OnboardingField,
} from '@web/lib/partner/onboarding';
import type {
  BookingConnectMethod,
  BookingProduct,
  IssuedCredential,
  PartnerAccount,
  PartnerOnboardingInput,
  PartnerPlan,
  RedemptionChannel,
} from '@web/lib/partner/types';
import CredentialReveal from './CredentialReveal';
import {
  adminCard,
  adminHint,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSecondaryButton,
  FieldError,
  FieldWarning,
  useAdminActor,
} from './partnerAdminUi';

const EMOJI_CHOICES = ['☕', '🍕', '🍔', '🍛', '🌶️', '🍦', '🧋', '🎬', '🎟️', '🎳', '🕹️', '🎶', '🏕️', '🧳', '✈️', '🛍️', '💪'];
const COLOUR_CHOICES = ['#C0392B', '#E67E22', '#F1C40F', '#27AE60', '#16A085', '#2980B9', '#6C5CE7', '#E84393', '#8D5524', '#2D3436'];
const PLANS: PartnerPlan[] = ['pilot', 'standard', 'enterprise'];

interface FormState {
  brandName: string;
  legalName: string;
  category: string;
  channels: RedemptionChannel[];
  /** Once the admin picks channels by hand, a category change no longer resets them. */
  channelsEdited: boolean;
  website: string;
  bookingProducts: BookingProduct[];
  bookingMethod: BookingConnectMethod;
  gstin: string;
  stateCode: string;
  city: string;
  logoEmoji: string;
  brandColor: string;
  plan: PartnerPlan;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  ownerIsContact: boolean;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  handle: string;
  handleEdited: boolean;
  sendEmail: boolean;
}

const EMPTY: FormState = {
  brandName: '',
  legalName: '',
  category: '',
  channels: ['in_store'],
  channelsEdited: false,
  website: '',
  bookingProducts: [],
  bookingMethod: 'lessgo_connect',
  gstin: '',
  stateCode: '',
  city: '',
  logoEmoji: '🍽️',
  brandColor: '#6C5CE7',
  plan: 'pilot',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  ownerIsContact: true,
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  handle: '',
  handleEdited: false,
  sendEmail: true,
};

function toInput(form: FormState): PartnerOnboardingInput {
  return {
    brandName: form.brandName,
    legalName: form.legalName,
    category: form.category,
    channels: form.channels,
    website: form.website,
    bookingProducts: form.channels.includes('api_booking') ? form.bookingProducts : [],
    bookingMethod: form.bookingMethod,
    gstin: form.gstin,
    city: form.city,
    stateCode: form.stateCode,
    logoEmoji: form.logoEmoji,
    brandColor: form.brandColor,
    plan: form.plan,
    contactName: form.contactName,
    contactEmail: form.contactEmail,
    contactPhone: form.contactPhone,
    handle: form.handle,
    owner: form.ownerIsContact
      ? { name: form.contactName, email: form.contactEmail, phone: form.contactPhone }
      : { name: form.ownerName, email: form.ownerEmail, phone: form.ownerPhone },
    dispatch: { email: form.sendEmail },
  };
}

export default function PartnerOnboarding() {
  const actor = useAdminActor();
  const handles = usePartnerQuery(async () => takenPartnerHandles(), 'taken-handles');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Set<OnboardingField>>(() => new Set());
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ partner: PartnerAccount; credential: IssuedCredential } | null>(null);

  const input = useMemo(() => toInput(form), [form]);
  const check = useMemo(() => validateOnboarding(input, handles.data ?? []), [handles.data, input]);
  const gst = form.gstin.trim().length === 15 ? checkGstin(form.gstin, form.stateCode || undefined) : null;

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const touch = (field: OnboardingField) => setTouched((current) => new Set(current).add(field));
  const errorFor = (field: OnboardingField) => (attempted || touched.has(field) ? check.errors[field] : undefined);

  function changeBrand(brandName: string) {
    update(form.handleEdited ? { brandName } : { brandName, handle: suggestHandle(brandName) });
  }

  /** The category decides the partner type until the admin picks channels by hand. */
  function changeCategory(category: string) {
    if (form.channelsEdited) {
      update({ category });
      return;
    }
    const defaults = categoryDefaults(category);
    update({ category, channels: defaults.channels, bookingProducts: defaults.bookingProducts });
  }

  function toggleChannel(channel: RedemptionChannel) {
    const channels = form.channels.includes(channel)
      ? form.channels.filter((candidate) => candidate !== channel)
      : REDEMPTION_CHANNELS.filter((candidate) => candidate === channel || form.channels.includes(candidate));
    const bookingProducts =
      channel === 'api_booking' && channels.includes('api_booking') && form.bookingProducts.length === 0
        ? categoryDefaults(form.category).bookingProducts
        : form.bookingProducts;
    update({ channels, bookingProducts, channelsEdited: true });
    touch('channels');
  }

  function toggleProduct(product: BookingProduct) {
    update({
      bookingProducts: form.bookingProducts.includes(product)
        ? form.bookingProducts.filter((candidate) => candidate !== product)
        : BOOKING_PRODUCTS.filter((candidate) => candidate === product || form.bookingProducts.includes(candidate)),
    });
    touch('bookingProducts');
  }

  const categoryHint = PARTNER_CATEGORY_DETAILS.find((category) => category.name === form.category)?.hint;
  const sellsOnline = form.channels.some((channel) => channel !== 'in_store');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setError(null);
    if (hasOnboardingErrors(check)) {
      setError('Fix the highlighted fields.');
      return;
    }
    setBusy(true);
    try {
      if (!(await isPartnerHandleAvailable(form.handle))) {
        setError(`“${form.handle}” was just taken. Pick another user-ID prefix.`);
        setBusy(false);
        return;
      }
      setResult(await onboardPartner(input, { actor }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const owner = input.owner;
    return (
      <div className="space-y-5">
        <div className={`${adminCard} flex flex-wrap items-center gap-4 border-ok p-5`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok-tint text-ok">
            <CircleCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold text-ink">{result.partner.brandName} is onboarded</h2>
            <p className="text-sm text-ink-muted">
              Status <span className="font-semibold text-warn">Invited</span> until {owner.name.split(' ')[0]} signs in and sets a
              password. Their first campaign will show up in the review queue.
            </p>
          </div>
        </div>
        <CredentialReveal
          credential={result.credential}
          brandName={result.partner.brandName}
          recipientName={owner.name}
          recipientEmail={owner.email}
          title="Owner login issued"
        />
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/partners/${result.partner.id}`} className={adminPrimaryButton}>
            Open {result.partner.brandName}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setForm(EMPTY);
              setTouched(new Set());
              setAttempted(false);
              void handles.reload();
            }}
            className={adminSecondaryButton}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Onboard another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <Section title="Business" description="As it appears on their GST registration and in the app.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="brandName" label="Brand name" error={errorFor('brandName')}>
              <input
                id="brandName"
                value={form.brandName}
                onChange={(event) => changeBrand(event.target.value)}
                onBlur={() => touch('brandName')}
                placeholder="e.g. Masala Magic"
                aria-invalid={!!errorFor('brandName')}
                className={adminInput}
              />
            </Field>
            <Field id="legalName" label="Registered business name" error={errorFor('legalName')}>
              <input
                id="legalName"
                value={form.legalName}
                onChange={(event) => update({ legalName: event.target.value })}
                onBlur={() => touch('legalName')}
                placeholder="e.g. Masala Magic Kitchens Pvt Ltd"
                aria-invalid={!!errorFor('legalName')}
                className={adminInput}
              />
            </Field>
            <Field
              id="category"
              label="Category"
              error={errorFor('category')}
              hint={categoryHint ?? 'Decides the partner type: in-store, online checkout or bookings.'}
            >
              <select
                id="category"
                value={form.category}
                onChange={(event) => changeCategory(event.target.value)}
                onBlur={() => touch('category')}
                aria-invalid={!!errorFor('category')}
                className={adminInput}
              >
                <option value="">Choose…</option>
                {PARTNER_CATEGORY_DETAILS.map((category) => (
                  <option key={category.name}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field
              id="gstin"
              label="GSTIN"
              error={errorFor('gstin')}
              warning={check.warnings.gstin}
              hint={
                gst && !gst.error && gst.registeredIn ? (
                  <span className="inline-flex items-center gap-1 text-ok">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Valid · registered in {stateName(gst.registeredIn)}
                  </span>
                ) : (
                  '15 characters; we check the format and the check digit.'
                )
              }
            >
              <input
                id="gstin"
                value={form.gstin}
                onChange={(event) => update({ gstin: event.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15) })}
                onBlur={() => touch('gstin')}
                placeholder="29ABCDE1234F1Z5"
                aria-invalid={!!errorFor('gstin')}
                className={`${adminInput} font-mono uppercase tracking-wide`}
              />
            </Field>
            <Field id="stateCode" label="State / UT" error={errorFor('stateCode')}>
              <select
                id="stateCode"
                value={form.stateCode}
                onChange={(event) => update({ stateCode: event.target.value })}
                onBlur={() => touch('stateCode')}
                aria-invalid={!!errorFor('stateCode')}
                className={adminInput}
              >
                <option value="">Choose…</option>
                {INDIA_GEO.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="city" label="City" error={errorFor('city')}>
              <input
                id="city"
                value={form.city}
                onChange={(event) => update({ city: event.target.value })}
                onBlur={() => touch('city')}
                placeholder="e.g. Bengaluru"
                aria-invalid={!!errorFor('city')}
                className={adminInput}
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className={adminLabel}>Logo in the Vibes tray</legend>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_CHOICES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={form.logoEmoji === emoji}
                    onClick={() => update({ logoEmoji: emoji })}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border text-xl ${
                      form.logoEmoji === emoji ? 'border-profile bg-profile-tint' : 'border-line hover:bg-surface-2'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {/* TODO(backend): let admins upload a logo image (file-upload-service) instead of an emoji. */}
              <p className={adminHint}>Shown in the partner’s story circle and portal.</p>
            </fieldset>
            <fieldset>
              <legend className={adminLabel}>Brand colour</legend>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOUR_CHOICES.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    aria-label={colour}
                    aria-pressed={form.brandColor.toUpperCase() === colour}
                    onClick={() => update({ brandColor: colour })}
                    className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-surface ${form.brandColor.toUpperCase() === colour ? 'ring-2 ring-ink' : ''}`}
                    style={{ backgroundColor: colour }}
                  />
                ))}
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(event) => update({ brandColor: event.target.value.toUpperCase() })}
                  aria-label="Custom brand colour"
                  className="h-8 w-10 cursor-pointer rounded border border-line bg-surface"
                />
              </div>
              <FieldError id="brandColor-error" message={errorFor('brandColor')} />
            </fieldset>
          </div>

          <fieldset className="mt-5">
            <legend className={adminLabel}>Plan</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLANS.map((plan) => (
                <label
                  key={plan}
                  className={`flex cursor-pointer gap-3 rounded-md border px-3 py-3 ${
                    form.plan === plan ? 'border-profile bg-profile-tint' : 'border-line hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={form.plan === plan}
                    onChange={() => update({ plan })}
                    className="mt-1 h-4 w-4 accent-[var(--profile)]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{PLAN_DETAILS[plan].label}</span>
                    <span className="block text-xs text-ink-muted">{PLAN_DETAILS[plan].summary}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section
          title="Partner type"
          description="How groups use the coupon. It decides the partner’s dashboard, campaign wizard and the app’s coupon flow."
        >
          <fieldset aria-describedby={errorFor('channels') ? 'channels-error' : undefined}>
            <legend className="sr-only">Redemption channels</legend>
            <div className="grid gap-3 md:grid-cols-3">
              {REDEMPTION_CHANNELS.map((channel) => {
                const detail = CHANNEL_DETAILS[channel];
                const checked = form.channels.includes(channel);
                return (
                  <label
                    key={channel}
                    className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                      checked ? 'border-profile bg-profile-tint' : 'border-line hover:bg-surface-2'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChannel(channel)}
                      className="mt-0.5 h-4 w-4 flex-none accent-[var(--profile)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">
                        <span aria-hidden="true">{detail.emoji}</span> {detail.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{detail.summary}</span>
                      <span className="mt-1 block text-[11px] text-ink-faint">{detail.examples}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <FieldError id="channels-error" message={errorFor('channels')} />
          {!errorFor('channels') ? <FieldWarning message={check.warnings.channels} /> : null}

          {sellsOnline ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="website"
                label="Website"
                error={errorFor('website')}
                hint="Links Lessgo opens and the codes your checkout accepts are limited to this domain."
              >
                <input
                  id="website"
                  type="url"
                  inputMode="url"
                  value={form.website}
                  onChange={(event) => update({ website: event.target.value })}
                  onBlur={() => touch('website')}
                  placeholder="https://shop.example.com"
                  aria-invalid={!!errorFor('website')}
                  className={adminInput}
                />
              </Field>
            </div>
          ) : null}

          {form.channels.includes('api_booking') ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <fieldset>
                <legend className={adminLabel}>Sold through Lessgo</legend>
                <div className="flex flex-wrap gap-1.5">
                  {BOOKING_PRODUCTS.map((product) => (
                    <button
                      key={product}
                      type="button"
                      aria-pressed={form.bookingProducts.includes(product)}
                      onClick={() => toggleProduct(product)}
                      className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${
                        form.bookingProducts.includes(product)
                          ? 'border-profile bg-profile-tint text-ink'
                          : 'border-line text-ink-muted hover:bg-surface-2'
                      }`}
                    >
                      {BOOKING_PRODUCT_DETAILS[product].label}
                    </button>
                  ))}
                </div>
                <FieldError id="bookingProducts-error" message={errorFor('bookingProducts')} />
              </fieldset>
              <fieldset>
                <legend className={adminLabel}>Booking connection</legend>
                <div className="space-y-2">
                  {(Object.keys(BOOKING_METHOD_DETAILS) as BookingConnectMethod[]).map((method) => (
                    <label key={method} className="flex items-start gap-2.5 text-sm text-ink">
                      <input
                        type="radio"
                        name="bookingMethod"
                        checked={form.bookingMethod === method}
                        onChange={() => update({ bookingMethod: method })}
                        className="mt-0.5 h-4 w-4 accent-[var(--profile)]"
                      />
                      <span>
                        <span className="font-semibold">{BOOKING_METHOD_DETAILS[method].label}</span>
                        <span className="block text-xs text-ink-muted">{BOOKING_METHOD_DETAILS[method].summary}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}
        </Section>

        <Section title="Contact and owner login" description="The owner gets the first login and can ask Lessgo for more.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="contactName" label="Contact person" error={errorFor('contactName')}>
              <input
                id="contactName"
                value={form.contactName}
                onChange={(event) => update({ contactName: event.target.value })}
                onBlur={() => touch('contactName')}
                autoComplete="off"
                aria-invalid={!!errorFor('contactName')}
                className={adminInput}
              />
            </Field>
            <Field id="contactEmail" label="Email" error={errorFor('contactEmail')}>
              <input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(event) => update({ contactEmail: event.target.value })}
                onBlur={() => touch('contactEmail')}
                autoComplete="off"
                aria-invalid={!!errorFor('contactEmail')}
                className={adminInput}
              />
            </Field>
            <Field id="contactPhone" label="Mobile" error={errorFor('contactPhone')}>
              <input
                id="contactPhone"
                type="tel"
                inputMode="numeric"
                value={form.contactPhone}
                onChange={(event) => update({ contactPhone: event.target.value })}
                onBlur={() => touch('contactPhone')}
                placeholder="98450 12345"
                autoComplete="off"
                aria-invalid={!!errorFor('contactPhone')}
                className={adminInput}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.ownerIsContact}
              onChange={(event) => update({ ownerIsContact: event.target.checked })}
              className="h-4 w-4 accent-[var(--profile)]"
            />
            The contact person is the owner who signs in
          </label>

          {!form.ownerIsContact ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field id="ownerName" label="Owner name" error={errorFor('ownerName')}>
                <input id="ownerName" value={form.ownerName} onChange={(event) => update({ ownerName: event.target.value })} onBlur={() => touch('ownerName')} aria-invalid={!!errorFor('ownerName')} className={adminInput} />
              </Field>
              <Field id="ownerEmail" label="Owner email" error={errorFor('ownerEmail')}>
                <input id="ownerEmail" type="email" value={form.ownerEmail} onChange={(event) => update({ ownerEmail: event.target.value })} onBlur={() => touch('ownerEmail')} aria-invalid={!!errorFor('ownerEmail')} className={adminInput} />
              </Field>
              <Field id="ownerPhone" label="Owner mobile" error={errorFor('ownerPhone')}>
                <input id="ownerPhone" type="tel" inputMode="numeric" value={form.ownerPhone} onChange={(event) => update({ ownerPhone: event.target.value })} onBlur={() => touch('ownerPhone')} aria-invalid={!!errorFor('ownerPhone')} className={adminInput} />
              </Field>
            </div>
          ) : form.ownerIsContact && errorFor('ownerPhone') ? (
            <FieldError id="ownerPhone-error" message={errorFor('ownerPhone')} />
          ) : null}

          <div className="mt-5 max-w-md">
            <Field
              id="handle"
              label="User-ID prefix"
              error={errorFor('handle')}
              hint={
                form.handle ? (
                  <>
                    The owner signs in as <span className="font-mono font-semibold text-ink">{form.handle}.owner</span>; later logins look
                    like <span className="font-mono">{form.handle}.manager</span>.
                  </>
                ) : (
                  'Suggested from the brand name. 3–16 lowercase letters or digits.'
                )
              }
            >
              <div className="flex items-center">
                <input
                  id="handle"
                  value={form.handle}
                  onChange={(event) =>
                    update({ handle: event.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16), handleEdited: true })
                  }
                  onBlur={() => touch('handle')}
                  aria-invalid={!!errorFor('handle')}
                  className={`${adminInput} rounded-r-none font-mono`}
                />
                <span className="flex min-h-11 items-center rounded-r-md border border-l-0 border-line bg-surface-2 px-3 font-mono text-sm text-ink-muted">
                  .owner
                </span>
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Send access" description="The temporary password works for 72 hours; they choose their own at first sign-in.">
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.sendEmail}
              onChange={(event) => update({ sendEmail: event.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[var(--profile)]"
            />
            <span>
              <span className="font-semibold">Email</span> the sign-in link, user ID and temporary password to{' '}
              {input.owner.email || 'the owner'}
            </span>
          </label>
          <FieldWarning message={check.warnings.dispatch} />
          <p className={adminHint}>
            You’ll also see the credentials once after creating the partner, to share them yourself.
            {PARTNER_PORTAL_CONFIG.useDummyData ? ' Demo: nothing is sent.' : ''}
          </p>
        </Section>

        {error ? (
          <p role="alert" className="rounded-md border border-down bg-down-tint px-4 py-3 text-sm font-medium text-ink">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || handles.loading} className={adminPrimaryButton}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Create partner and issue login
          </button>
          <Link href="/admin/partners" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className={`${adminCard} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Preview</p>
          <div className="mt-3 flex items-center gap-3">
            <BrandAvatar partner={{ logoEmoji: form.logoEmoji, brandColor: form.brandColor, brandName: form.brandName }} size={48} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-ink">{form.brandName || 'Brand name'}</p>
              <p className="truncate text-xs text-ink-muted">
                {[form.category, form.city && form.stateCode ? `${form.city}, ${stateName(form.stateCode)}` : form.city].filter(Boolean).join(' · ') ||
                  'Category · City'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {form.channels.map((channel) => (
              <ChannelBadge key={channel} channel={channel} />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {PLAN_DETAILS[form.plan].label} plan · signs in as{' '}
            <span className="font-mono text-ink">{form.handle ? `${form.handle}.owner` : '—'}</span>
          </p>
        </div>
        <div className={`${adminCard} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">What happens next</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink">
            <li>The partner is created as Invited, with an owner login.</li>
            <li>The owner gets their user ID and a 72-hour temporary password.</li>
            <li>At first sign-in they choose their own password and the partner becomes Active.</li>
            {sellsOnline ? (
              <li>
                They connect {form.channels.includes('api_booking') ? 'their booking API' : 'their checkout'} under Integrations, pass the
                sandbox checks and ask to go live — you approve it here.
              </li>
            ) : null}
            <li>
              {form.channels.includes('in_store') ? 'They add outlets and submit' : 'They submit'} a campaign, which lands in your review
              queue.
            </li>
          </ol>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className={`${adminCard} p-5`}>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mb-4 mt-0.5 text-sm text-ink-muted">{description}</p>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  warning,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  warning?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={adminLabel}>
        {label}
      </label>
      {children}
      {error ? <FieldError id={`${id}-error`} message={error} /> : warning ? <FieldWarning message={warning} /> : hint ? <p className={adminHint}>{hint}</p> : null}
    </div>
  );
}
