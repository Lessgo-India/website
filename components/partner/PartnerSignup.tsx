'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, BadgeCheck, Building2, Check, ImagePlus, Loader2, Mail, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { ThemeToggle } from '@ui/ThemeToggle';
import { BrandAvatar } from '@ui/partner/ui';
import {
  BOOKING_PRODUCT_DETAILS,
  BOOKING_PRODUCTS,
  CHANNEL_DETAILS,
  REDEMPTION_CHANNELS,
} from '@web/lib/partner/channels';
import { INDIA_GEO } from '@web/lib/partner/indiaGeo';
import {
  categoryDefaults,
  hasOnboardingErrors,
  PARTNER_CATEGORY_DETAILS,
  suggestHandle,
  validateOnboarding,
} from '@web/lib/partner/onboarding';
import { BRAND_LOGO_ACCEPT, brandLogoError } from '@web/lib/partner/brandLogo';
import { submitPartnerApplication, uploadPartnerApplicationLogo } from '@web/lib/partner/partnerApplicationsApi';
import type {
  BookingConnectMethod,
  BookingProduct,
  PartnerApplication,
  PartnerApplicationInput,
  PartnerOnboardingInput,
  RedemptionChannel,
} from '@web/lib/partner/types';
import { PortalMark, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './ui';
import TurnstileWidget from './TurnstileWidget';

interface FormState extends PartnerApplicationInput {
  channelsEdited: boolean;
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
  city: '',
  stateCode: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  handle: '',
};

function validationInput(form: FormState): PartnerOnboardingInput {
  return {
    ...form,
    logoEmoji: '🏷️',
    brandColor: '#22D3C5',
    plan: 'pilot',
    owner: { name: form.contactName, email: form.contactEmail, phone: form.contactPhone },
    dispatch: { email: true },
  };
}

export default function PartnerSignup() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const logoPreviewUrlRef = useRef<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PartnerApplication | null>(null);
  const check = useMemo(() => validateOnboarding(validationInput(form)), [form]);
  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(
    () => () => {
      if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current);
    },
    [],
  );

  function changeBrand(brandName: string) {
    update({ brandName, handle: suggestHandle(brandName) });
  }

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
  }

  function toggleProduct(product: BookingProduct) {
    update({
      bookingProducts: form.bookingProducts.includes(product)
        ? form.bookingProducts.filter((candidate) => candidate !== product)
        : BOOKING_PRODUCTS.filter((candidate) => candidate === product || form.bookingProducts.includes(candidate)),
    });
  }

  function removeBrandLogo() {
    if (logoPreviewUrlRef.current) {
      URL.revokeObjectURL(logoPreviewUrlRef.current);
      logoPreviewUrlRef.current = null;
    }
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setUploadedLogoUrl(null);
    setLogoError(null);
    if (logoInput.current) logoInput.current.value = '';
  }

  function selectBrandLogo(file: File | undefined) {
    setUploadedLogoUrl(null);
    if (!file) {
      removeBrandLogo();
      return;
    }
    const validationError = brandLogoError(file);
    if (validationError) {
      removeBrandLogo();
      setLogoError(validationError);
      return;
    }
    setLogoError(null);
    if (logoPreviewUrlRef.current) URL.revokeObjectURL(logoPreviewUrlRef.current);
    logoPreviewUrlRef.current = URL.createObjectURL(file);
    setLogoPreviewUrl(logoPreviewUrlRef.current);
    setLogoFile(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setError(null);
    if (hasOnboardingErrors(check) || logoError) {
      setError('Fix the highlighted fields before submitting.');
      return;
    }
    if (!captchaToken) {
      setError('Complete the human verification.');
      return;
    }
    setBusy(true);
    try {
      let logoUrl = uploadedLogoUrl;
      if (logoFile && !logoUrl) {
        logoUrl = await uploadPartnerApplicationLogo(logoFile);
        setUploadedLogoUrl(logoUrl);
      }
      const input: PartnerApplicationInput = {
        brandName: form.brandName,
        legalName: form.legalName,
        category: form.category,
        channels: form.channels,
        website: form.website,
        bookingProducts: form.bookingProducts,
        bookingMethod: form.bookingMethod,
        gstin: form.gstin,
        city: form.city,
        stateCode: form.stateCode,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        handle: form.handle,
        ...(logoUrl ? { logoUrl } : {}),
      };
      setResult(await submitPartnerApplication({ ...input, captchaToken }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError((caught as Error).message);
      setCaptchaReset((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  if (result) return <ApplicationSubmitted application={result} />;

  const fieldError = (field: keyof typeof check.errors) => (attempted ? check.errors[field] : undefined);
  const online = form.channels.some((channel) => channel !== 'in_store');

  return (
    <div className="min-h-screen min-h-dvh bg-bg text-ink">
      <SignupHeader />
      <main className="container-page grid gap-12 py-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(620px,1.28fr)] lg:gap-16 lg:py-20">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#22d3c5]">Partner application</p>
          <h1 className="mt-4 max-w-md font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Tell us how your business can host a good plan.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">
            Every application is reviewed by the Lessgo team. No account or campaign goes live automatically.
          </p>
          <div className="mt-9 space-y-5">
            {[
              [Building2, 'We review the business and GSTIN'],
              [MapPin, 'We confirm the right redemption setup'],
              [Mail, 'Approved owners receive account details by email'],
            ].map(([Icon, copy], index) => {
              const StepIcon = Icon as typeof Building2;
              return (
                <div key={String(copy)} className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-2 text-[#22d3c5]">
                    <StepIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm text-ink-muted"><span className="mr-2 font-mono text-xs text-ink-faint">0{index + 1}</span>{copy as string}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-9 rounded-md bg-surface p-4 text-sm text-ink-muted">
            <ShieldCheck className="mb-3 h-5 w-5 text-profile" aria-hidden="true" />
            Your CAPTCHA token is verified once and never stored. Account credentials are only created after approval.
          </div>
        </aside>

        <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-surface p-5 shadow-soft sm:p-8">
          <FormSection number="1" title="Business" body="The registered business and where it operates.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand name" error={fieldError('brandName')}>
                <input value={form.brandName} onChange={(event) => changeBrand(event.target.value)} className={inputClass} placeholder="e.g. Brew Bros" />
              </Field>
              <Field label="Registered business name" error={fieldError('legalName')}>
                <input value={form.legalName} onChange={(event) => update({ legalName: event.target.value })} className={inputClass} placeholder="As on GST registration" />
              </Field>
              <Field label="Category" error={fieldError('category')}>
                <select value={form.category} onChange={(event) => changeCategory(event.target.value)} className={inputClass}>
                  <option value="">Choose a category</option>
                  {PARTNER_CATEGORY_DETAILS.map((category) => <option key={category.name}>{category.name}</option>)}
                </select>
              </Field>
              <Field label="GSTIN" error={fieldError('gstin')}>
                <input value={form.gstin} onChange={(event) => update({ gstin: event.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15) })} className={`${inputClass} font-mono uppercase`} placeholder="29ABCDE1234F1Z5" />
              </Field>
              <Field label="State / UT" error={fieldError('stateCode')}>
                <select value={form.stateCode} onChange={(event) => update({ stateCode: event.target.value })} className={inputClass}>
                  <option value="">Choose state</option>
                  {INDIA_GEO.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
                </select>
              </Field>
              <Field label="City" error={fieldError('city')}>
                <input value={form.city} onChange={(event) => update({ city: event.target.value })} className={inputClass} placeholder="e.g. Bengaluru" />
              </Field>
            </div>
            <Field label={online ? 'Website' : 'Website (optional)'} error={fieldError('website')}>
              <input value={form.website} onChange={(event) => update({ website: event.target.value })} className={inputClass} placeholder="https://yourbusiness.in" inputMode="url" />
            </Field>
            <div>
              <span className={labelClass}>Brand logo / image (optional)</span>
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-bg-elev p-3">
                <BrandAvatar
                  partner={{
                    logoUrl: logoPreviewUrl ?? undefined,
                    logoEmoji: '🏷️',
                    brandColor: '#22D3C5',
                    brandName: form.brandName,
                  }}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{logoFile?.name ?? 'Upload your brand logo'}</p>
                  <p className="text-xs text-ink-muted">JPG, PNG or WebP · max 10 MB · square works best</p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <label htmlFor="partner-application-logo" className={`${secondaryButtonClass} min-h-9 flex-1 cursor-pointer px-3 sm:flex-none`}>
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {logoFile ? 'Replace' : 'Upload'}
                  </label>
                  <input
                    ref={logoInput}
                    id="partner-application-logo"
                    type="file"
                    accept={BRAND_LOGO_ACCEPT}
                    onChange={(event) => selectBrandLogo(event.target.files?.[0])}
                    className="sr-only"
                  />
                  {logoFile ? (
                    <button
                      type="button"
                      onClick={removeBrandLogo}
                      aria-label="Remove uploaded brand logo"
                      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface hover:text-down"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
              {logoError ? <ErrorText>{logoError}</ErrorText> : null}
              <p className="mt-2 text-xs text-ink-muted">
                We will use this mark in your partner profile and Lessgo offer cards after approval.
              </p>
            </div>
          </FormSection>

          <FormSection number="2" title="How groups redeem" body="Choose every path your business can support.">
            <div className="grid gap-3 sm:grid-cols-3">
              {REDEMPTION_CHANNELS.map((channel) => {
                const selected = form.channels.includes(channel);
                return (
                  <button key={channel} type="button" aria-pressed={selected} onClick={() => toggleChannel(channel)} className={`min-h-36 rounded-md border p-4 text-left transition-colors ${selected ? 'border-[#22d3c5] bg-surface-2' : 'border-line hover:bg-surface-2'}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xl" aria-hidden="true">{CHANNEL_DETAILS[channel].emoji}</span>
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[#22d3c5] bg-[#22d3c5] text-black' : 'border-line-strong'}`}>
                        {selected ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                      </span>
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-ink">{CHANNEL_DETAILS[channel].label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{CHANNEL_DETAILS[channel].summary}</span>
                  </button>
                );
              })}
            </div>
            {fieldError('channels') ? <ErrorText>{fieldError('channels')}</ErrorText> : null}

            {form.channels.includes('api_booking') ? (
              <div className="rounded-md bg-bg-elev p-4">
                <p className={labelClass}>What can groups book?</p>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_PRODUCTS.map((product) => (
                    <button key={product} type="button" aria-pressed={form.bookingProducts.includes(product)} onClick={() => toggleProduct(product)} className={`min-h-10 rounded-full border px-3 text-xs font-semibold ${form.bookingProducts.includes(product) ? 'border-profile bg-profile-tint text-ink' : 'border-line text-ink-muted'}`}>
                      {BOOKING_PRODUCT_DETAILS[product].label}
                    </button>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className={labelClass}>Connection method</span>
                  <select value={form.bookingMethod} onChange={(event) => update({ bookingMethod: event.target.value as BookingConnectMethod })} className={inputClass}>
                    <option value="lessgo_connect">Lessgo Connect</option>
                    <option value="adapter">Existing API adapter</option>
                  </select>
                </label>
                {fieldError('bookingProducts') ? <ErrorText>{fieldError('bookingProducts')}</ErrorText> : null}
              </div>
            ) : null}
          </FormSection>

          <FormSection number="3" title="Primary contact" body="This person receives application updates and becomes the first owner.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={fieldError('contactName')}>
                <input value={form.contactName} onChange={(event) => update({ contactName: event.target.value })} className={inputClass} autoComplete="name" placeholder="Your name" />
              </Field>
              <Field label="Work email" error={fieldError('contactEmail')}>
                <input value={form.contactEmail} onChange={(event) => update({ contactEmail: event.target.value })} className={inputClass} type="email" autoComplete="email" placeholder="name@company.in" />
              </Field>
              <Field label="Mobile number" error={fieldError('contactPhone')}>
                <input value={form.contactPhone} onChange={(event) => update({ contactPhone: event.target.value })} className={inputClass} inputMode="tel" autoComplete="tel" placeholder="10-digit Indian mobile" />
              </Field>
              <Field label="Preferred partner ID" error={fieldError('handle')}>
                <input value={form.handle} onChange={(event) => update({ handle: event.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) })} className={`${inputClass} font-mono`} autoCapitalize="none" spellCheck={false} placeholder="e.g. brewbros" />
              </Field>
            </div>
          </FormSection>

          <div className="border-t border-line pt-6">
            <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} />
            {error ? <p role="alert" className="mt-4 rounded-md bg-down-tint px-4 py-3 text-sm font-medium text-down">{error}</p> : null}
            <button type="submit" disabled={busy} className={`${primaryButtonClass} mt-5 w-full`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Submitting…' : 'Submit application for review'}
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
              By submitting, you confirm these details are accurate and agree that Lessgo may contact you about the application. See our{' '}
              <Link href="/policy" className="font-semibold text-ink hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

function SignupHeader() {
  return (
    <header className="partner-public-header border-b border-line bg-bg">
      <div className="container-page flex min-h-20 items-center justify-between gap-4">
        <Link href="/partner" className="flex items-center gap-3" aria-label="Back to Lessgo Partners">
          <ArrowLeft className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          <PortalMark />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-ink-muted sm:inline">Already approved?</span>
          <ThemeToggle className="rounded-md" />
          <Link href="/partner/login" className={`${secondaryButtonClass} px-3 sm:px-5`}>
            <span className="sm:hidden">Login</span>
            <span className="hidden sm:inline">Partner login</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function FormSection({ number, title, body, children }: { number: string; title: string; body: string; children: ReactNode }) {
  return (
    <section className="border-b border-line pb-7 last:border-0">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#22d3c5] font-mono text-xs font-bold text-black">{number}</span>
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="text-xs text-ink-muted">{body}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </label>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-down">{children}</p>;
}

function ApplicationSubmitted({ application }: { application: PartnerApplication }) {
  return (
    <div className="min-h-screen min-h-dvh bg-bg text-ink">
      <SignupHeader />
      <main className="container-page flex min-h-[calc(100dvh-5rem)] items-center justify-center py-16">
        <section className="w-full max-w-2xl rounded-lg border border-ok bg-surface p-7 text-center shadow-soft sm:p-10">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ok-tint text-ok">
            <BadgeCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold">Application received</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
            We will review {application.brandName} and contact {application.contactEmail}. If approved, the owner will receive a welcome email with the partner login and temporary account details.
          </p>
          <p className="mt-6 text-xs text-ink-muted">
            Reference <span className="font-mono font-semibold text-ink">{application.id}</span>
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/partner" className={primaryButtonClass}>Back to Lessgo Partners</Link>
            <Link href="/partner/login" className={secondaryButtonClass}>Partner login</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
