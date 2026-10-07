'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Send,
  Users,
} from 'lucide-react';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { DUMMY_CREATIVE_LIBRARY } from '@web/lib/partner/dummyData';
import { EVENT_TYPES, eventTypeLabel } from '@web/lib/partner/eventTypes';
import { formatCompact, formatCount, formatDate, formatInr, fromDateInputValue, toDateInputValue } from '@web/lib/partner/format';
import {
  fetchAudienceEstimate,
  getPartnerCampaign,
  listPartnerCampaigns,
  listPartnerOutlets,
  PartnerApiError,
  submitPartnerCampaign,
} from '@web/lib/partner/partnerApi';
import {
  AGE_BRACKETS,
  buildVoucherCode,
  GENDER_OPTIONS,
  hasDraftErrors,
  minorToRupeesInput,
  offerLabel,
  rupeesToMinor,
  validateCampaignDraft,
  validateTargeting,
  type CampaignDraft,
  type DraftErrors,
  type DraftStep,
} from '@web/lib/partner/rules';
import { describeAges, describeGender, formatAgeBracket, geoName, ruleNames } from '@web/lib/partner/targetingText';
import type {
  AgeBracket,
  CampaignOffer,
  OfferDiscountType,
  OfferGender,
  OfferGeoRule,
  OfferTargeting,
  PartnerAccount,
  PartnerCampaign,
  PartnerOutlet,
} from '@web/lib/partner/types';
import CampaignPreview from './CampaignPreview';
import { describeOffer } from './CampaignDetail';
import GeoRulePicker from './GeoRulePicker';
import { useSignedInPartner } from './PartnerSessionProvider';
import {
  Card,
  ErrorNote,
  hintClass,
  inputClass,
  labelClass,
  LoadingBlock,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui';
import { usePartnerQuery } from './usePartnerQuery';

type StepKey = DraftStep | 'review';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'offer', label: 'Offer' },
  { key: 'creative', label: 'Creative' },
  { key: 'audience', label: 'Audience' },
  { key: 'rules', label: 'Vouchers & outlets' },
  { key: 'review', label: 'Review' },
];

const OFFER_TYPES: { value: OfferDiscountType; label: string }[] = [
  { value: 'flat', label: '₹ off' },
  { value: 'percent', label: '% off' },
  { value: 'bogo', label: 'Buy 1 get 1' },
  { value: 'freebie', label: 'Freebie' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

interface FormState {
  headline: string;
  description: string;
  terms: string[];
  offerType: OfferDiscountType;
  flatRupees: string;
  percent: string;
  maxDiscountRupees: string;
  minBillRupees: string;
  freebieItem: string;
  minGroupSize: string;
  storyImageUrl: string;
  coverImageUrl: string;
  coverSameAsStory: boolean;
  eventType: string;
  eventName: string;
  ageBrackets: AgeBracket[];
  gender: OfferGender;
  geoMode: 'all' | 'custom';
  include: OfferGeoRule;
  exclude: OfferGeoRule;
  codePrefix: string;
  validityDays: string;
  perUserLimit: string;
  redemptionLimit: string;
  dailyLimit: string;
  startDate: string;
  endDate: string;
  restrictOutlets: boolean;
  outletIds: string[];
  confirmed: boolean;
}

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);

function toTargeting(form: FormState): OfferTargeting {
  const hasExclude = !!(form.exclude.states?.length || form.exclude.districts?.length);
  const geo =
    form.geoMode === 'custom'
      ? { include: form.include, ...(hasExclude ? { exclude: form.exclude } : {}) }
      : hasExclude
        ? { exclude: form.exclude }
        : undefined;
  return {
    ...(form.ageBrackets.length ? { ageBrackets: form.ageBrackets } : {}),
    ...(form.gender !== 'all' ? { gender: form.gender } : {}),
    ...(geo ? { geo } : {}),
  };
}

function toOffer(form: FormState): Omit<CampaignOffer, 'label'> {
  const minBillMinor = rupeesToMinor(form.minBillRupees) ?? undefined;
  const base = { type: form.offerType, minGroupSize: toInt(form.minGroupSize), ...(minBillMinor ? { minBillMinor } : {}) };
  switch (form.offerType) {
    case 'flat':
      return { ...base, valueMinor: rupeesToMinor(form.flatRupees) ?? 0 };
    case 'percent': {
      const maxDiscountMinor = rupeesToMinor(form.maxDiscountRupees) ?? undefined;
      return {
        ...base,
        percentBp: Math.round((Number(form.percent) || 0) * 100),
        ...(maxDiscountMinor ? { maxDiscountMinor } : {}),
      };
    }
    default:
      return { ...base, freebieItem: form.freebieItem.trim() };
  }
}

function toDraft(form: FormState): CampaignDraft {
  return {
    headline: form.headline,
    description: form.description,
    terms: form.terms,
    storyImageUrl: form.storyImageUrl.trim(),
    coverImageUrl: (form.coverSameAsStory ? form.storyImageUrl : form.coverImageUrl).trim(),
    offer: toOffer(form),
    voucherPolicy: {
      codePrefix: form.codePrefix,
      validityDays: toInt(form.validityDays),
      perUserLimit: toInt(form.perUserLimit),
      redemptionLimit: form.redemptionLimit.trim() ? toInt(form.redemptionLimit) : null,
      dailyLimit: form.dailyLimit.trim() ? toInt(form.dailyLimit) : null,
    },
    targeting: toTargeting(form),
    outletIds: form.restrictOutlets ? form.outletIds : [],
    startAt: form.startDate ? fromDateInputValue(form.startDate) : '',
    endAt: form.endDate ? fromDateInputValue(form.endDate, true) : '',
    eventType: form.eventType,
    eventName: form.eventName,
  };
}

function initialForm(
  partner: PartnerAccount,
  outlets: PartnerOutlet[],
  campaigns: PartnerCampaign[],
  source: PartnerCampaign | null,
): FormState {
  const now = Date.now();
  const activeOutlets = outlets.filter((outlet) => outlet.status === 'active');
  const outletDistricts = [...new Set(activeOutlets.map((outlet) => outlet.districtId))];
  const prefix =
    campaigns[0]?.voucherPolicy.codePrefix ?? partner.brandName.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
  const start = toDateInputValue(new Date(now + 2 * DAY_MS).toISOString());
  const end = toDateInputValue(new Date(now + 32 * DAY_MS).toISOString());

  if (source) {
    const include = source.targeting.geo?.include ?? {};
    return {
      headline: source.headline,
      description: source.description,
      terms: [...source.terms],
      offerType: source.offer.type,
      flatRupees: minorToRupeesInput(source.offer.valueMinor),
      percent: source.offer.percentBp ? String(source.offer.percentBp / 100) : '',
      maxDiscountRupees: minorToRupeesInput(source.offer.maxDiscountMinor),
      minBillRupees: minorToRupeesInput(source.offer.minBillMinor),
      freebieItem: source.offer.freebieItem ?? '',
      minGroupSize: String(source.offer.minGroupSize),
      storyImageUrl: source.creative.storyImageUrl,
      coverImageUrl: source.creative.coverImageUrl,
      coverSameAsStory: false,
      eventType: source.eventDefaults.eventType,
      eventName: source.eventDefaults.name,
      ageBrackets: source.targeting.ageBrackets ?? [],
      gender: source.targeting.gender ?? 'all',
      geoMode: include.states?.length || include.districts?.length ? 'custom' : 'all',
      include,
      exclude: source.targeting.geo?.exclude ?? {},
      codePrefix: source.voucherPolicy.codePrefix,
      validityDays: String(source.voucherPolicy.validityDays),
      perUserLimit: String(source.voucherPolicy.perUserLimit),
      redemptionLimit: source.voucherPolicy.redemptionLimit ? String(source.voucherPolicy.redemptionLimit) : '',
      dailyLimit: source.voucherPolicy.dailyLimit ? String(source.voucherPolicy.dailyLimit) : '',
      startDate: start,
      endDate: end,
      restrictOutlets: source.outletIds.length > 0,
      outletIds: source.outletIds.filter((id) => activeOutlets.some((outlet) => outlet.id === id)),
      confirmed: false,
    };
  }

  const creative = DUMMY_CREATIVE_LIBRARY[0];
  return {
    headline: '',
    description: '',
    terms: [`Needs a Lessgo group of 3 or more.`, 'One coupon per event. Not valid with other offers.'],
    offerType: 'flat',
    flatRupees: '200',
    percent: '20',
    maxDiscountRupees: '300',
    minBillRupees: '',
    freebieItem: '',
    minGroupSize: '3',
    storyImageUrl: campaigns[0]?.creative.storyImageUrl ?? creative.storyImageUrl,
    coverImageUrl: campaigns[0]?.creative.coverImageUrl ?? creative.coverImageUrl,
    coverSameAsStory: true,
    eventType: campaigns[0]?.eventDefaults.eventType ?? 'HANGOUT',
    eventName: `Plan at ${partner.brandName}`,
    ageBrackets: [],
    gender: 'all',
    geoMode: outletDistricts.length ? 'custom' : 'all',
    include: outletDistricts.length ? { districts: outletDistricts } : {},
    exclude: {},
    codePrefix: prefix,
    validityDays: '14',
    perUserLimit: '1',
    redemptionLimit: '500',
    dailyLimit: '50',
    startDate: start,
    endDate: end,
    restrictOutlets: activeOutlets.length > 0,
    outletIds: activeOutlets.map((outlet) => outlet.id),
    confirmed: false,
  };
}

export default function CampaignWizard({ fromCampaignId }: { fromCampaignId: string | null }) {
  const session = useSignedInPartner();
  const query = usePartnerQuery(async () => {
    const [outlets, campaigns, source] = await Promise.all([
      listPartnerOutlets(session),
      listPartnerCampaigns(session),
      fromCampaignId ? getPartnerCampaign(session, fromCampaignId).catch(() => null) : Promise.resolve(null),
    ]);
    return { outlets, campaigns, source };
  }, `${session.partner.id}:${fromCampaignId ?? ''}`);

  return (
    <>
      <Link href="/partner/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Campaigns
      </Link>
      <PageHeader
        title={query.data?.source ? (query.data.source.status === 'rejected' ? 'Edit & resubmit' : 'Duplicate campaign') : 'New campaign'}
        description="Your offer shows up as a story in the Vibes tray for the people you target. Lessgo reviews it before it goes live."
      />
      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}
      {query.data?.source?.status === 'rejected' && query.data.source.reviewNote ? (
        <div role="note" className="mb-6 flex gap-3 rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-down" aria-hidden="true" />
          <div>
            <p className="font-semibold">Lessgo asked for changes</p>
            <p className="mt-0.5 text-ink-muted">{query.data.source.reviewNote}</p>
          </div>
        </div>
      ) : null}
      {query.data ? (
        <WizardForm
          partner={session.partner}
          outlets={query.data.outlets}
          initial={initialForm(session.partner, query.data.outlets, query.data.campaigns, query.data.source)}
          resubmitOf={query.data.source?.status === 'rejected' ? query.data.source.id : undefined}
        />
      ) : query.loading ? (
        <LoadingBlock />
      ) : null}
    </>
  );
}

function WizardForm({
  partner,
  outlets,
  initial,
  resubmitOf,
}: {
  partner: PartnerAccount;
  outlets: PartnerOutlet[];
  initial: FormState;
  /** Set when editing a rejected campaign: submitting resubmits it in place. */
  resubmitOf?: string;
}) {
  const session = useSignedInPartner();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [step, setStep] = useState<StepKey>('offer');
  const [visited, setVisited] = useState<Set<StepKey>>(() => new Set(['offer']));
  const [showErrors, setShowErrors] = useState<Set<StepKey>>(() => new Set());
  const [estimate, setEstimate] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<DraftErrors>({});

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const draft = useMemo(() => toDraft(form), [form]);
  const errors = useMemo(() => {
    const result = validateCampaignDraft(draft, { nameOf: geoName });
    if (form.restrictOutlets && form.outletIds.length === 0) {
      (result.rules ??= []).push('Pick at least one outlet, or allow any venue.');
    }
    return result;
  }, [draft, form.restrictOutlets, form.outletIds.length]);
  const targetingKey = JSON.stringify(draft.targeting);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchAudienceEstimate(JSON.parse(targetingKey) as OfferTargeting)
        .then((value) => {
          if (!cancelled) setEstimate(value);
        })
        .catch(() => {
          if (!cancelled) setEstimate(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [targetingKey]);

  const tooNarrow = estimate !== null && estimate < PARTNER_PORTAL_CONFIG.minAudience;
  const stepIndex = STEPS.findIndex((candidate) => candidate.key === step);
  const label = offerLabel(draft.offer);

  function go(next: StepKey) {
    setStep(next);
    setVisited((current) => new Set(current).add(next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (step !== 'review' && (errors[step]?.length || (step === 'audience' && tooNarrow))) {
      setShowErrors((current) => new Set(current).add(step));
      return;
    }
    go(STEPS[stepIndex + 1].key);
  }

  async function submit() {
    setShowErrors(new Set(STEPS.map((candidate) => candidate.key)));
    if (hasDraftErrors(errors) || tooNarrow || !form.confirmed) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await submitPartnerCampaign(session, draft, { resubmitOf });
      router.push(`/partner/campaigns/${created.id}?submitted=1`);
    } catch (caught) {
      setSubmitError((caught as Error).message);
      if (caught instanceof PartnerApiError && caught.details) setServerErrors(caught.details);
      setSubmitting(false);
    }
  }

  const stepErrors = (key: DraftStep) =>
    showErrors.has(key) ? [...(errors[key] ?? []), ...(serverErrors[key] ?? [])] : [];

  return (
    <>
      <ol className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Steps">
        {STEPS.map((candidate, index) => {
          const active = candidate.key === step;
          const done = index < stepIndex;
          const reachable = visited.has(candidate.key);
          const hasError = candidate.key !== 'review' && showErrors.has(candidate.key) && !!errors[candidate.key]?.length;
          return (
            <li key={candidate.key} className="flex-none">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => go(candidate.key)}
                aria-current={active ? 'step' : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                  active
                    ? 'border-ink bg-ink text-bg'
                    : hasError
                      ? 'border-down text-down'
                      : reachable
                        ? 'border-line-strong text-ink hover:bg-surface-2'
                        : 'border-line text-ink-faint'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    active ? 'bg-bg text-ink' : done ? 'bg-ok text-white' : 'bg-surface-2 text-ink-muted'
                  }`}
                >
                  {done && !hasError ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
                </span>
                {candidate.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card>
            {step === 'offer' ? <OfferStep form={form} update={update} label={label} errors={stepErrors('offer')} /> : null}
            {step === 'creative' ? <CreativeStep form={form} update={update} errors={stepErrors('creative')} /> : null}
            {step === 'audience' ? (
              <AudienceStep
                form={form}
                update={update}
                outlets={outlets}
                estimate={estimate}
                tooNarrow={tooNarrow}
                errors={stepErrors('audience')}
                showNarrow={showErrors.has('audience')}
              />
            ) : null}
            {step === 'rules' ? <RulesStep form={form} update={update} outlets={outlets} errors={stepErrors('rules')} /> : null}
            {step === 'review' ? (
              <ReviewStep
                form={form}
                update={update}
                draft={draft}
                label={label}
                outlets={outlets}
                estimate={estimate}
                tooNarrow={tooNarrow}
                errors={errors}
                showConfirmError={showErrors.has('review') && !form.confirmed}
                onEdit={go}
              />
            ) : null}
          </Card>

          {submitError ? (
            <div className="mt-4">
              <ErrorNote message={submitError} />
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(STEPS[Math.max(0, stepIndex - 1)].key)}
              disabled={stepIndex === 0 || submitting}
              className={secondaryButtonClass}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            {step === 'review' ? (
              <button type="button" onClick={submit} disabled={submitting} className={primaryButtonClass}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {resubmitOf ? 'Resubmit for review' : 'Submit for review'}
              </button>
            ) : (
              <button type="button" onClick={goNext} className={primaryButtonClass}>
                Next: {STEPS[stepIndex + 1].label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">Live preview</p>
          <CampaignPreview
            partner={partner}
            headline={form.headline}
            description={form.description}
            offerLabel={label}
            storyImageUrl={form.storyImageUrl}
            terms={form.terms}
            minGroupSize={Number.isNaN(draft.offer.minGroupSize) ? 2 : draft.offer.minGroupSize}
          />
          <ReachBadge estimate={estimate} tooNarrow={tooNarrow} />
        </aside>
      </div>
    </>
  );
}

// ── Steps ───────────────────────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
}

function OfferStep({ form, update, label, errors }: StepProps & { label: string; errors: string[] }) {
  return (
    <div className="space-y-5">
      <StepIntro title="What are you offering?" body="Keep it short — the headline is the first thing people read on the story." />
      <Field id="headline" label="Headline" hint={`${form.headline.trim().length}/60`}>
        <input
          id="headline"
          value={form.headline}
          maxLength={60}
          onChange={(event) => update({ headline: event.target.value })}
          placeholder="e.g. ₹200 off your group pizza night"
          className={inputClass}
        />
      </Field>
      <Field id="description" label="Description" hint={`${form.description.trim().length}/160 · optional`}>
        <textarea
          id="description"
          value={form.description}
          maxLength={160}
          rows={2}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="One line on why groups should come."
          className={`${inputClass} py-2.5`}
        />
      </Field>

      <div>
        <p className={labelClass}>Discount</p>
        <Segmented options={OFFER_TYPES} value={form.offerType} onChange={(offerType) => update({ offerType })} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {form.offerType === 'flat' ? (
            <Field id="flat" label="Amount off (₹)">
              <input id="flat" inputMode="decimal" value={form.flatRupees} onChange={(event) => update({ flatRupees: event.target.value })} className={inputClass} />
            </Field>
          ) : null}
          {form.offerType === 'percent' ? (
            <>
              <Field id="percent" label="Percent off">
                <input id="percent" inputMode="decimal" value={form.percent} onChange={(event) => update({ percent: event.target.value })} className={inputClass} />
              </Field>
              <Field id="cap" label="Maximum discount (₹)">
                <input id="cap" inputMode="decimal" value={form.maxDiscountRupees} onChange={(event) => update({ maxDiscountRupees: event.target.value })} className={inputClass} />
              </Field>
            </>
          ) : null}
          {form.offerType === 'bogo' || form.offerType === 'freebie' ? (
            <Field id="freebie" label={form.offerType === 'bogo' ? 'What’s free' : 'Free item'}>
              <input
                id="freebie"
                value={form.freebieItem}
                maxLength={40}
                placeholder={form.offerType === 'bogo' ? 'e.g. 1 hour of game time' : 'e.g. Dessert platter'}
                onChange={(event) => update({ freebieItem: event.target.value })}
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field id="minbill" label="Minimum bill (₹)" hint="Optional">
            <input id="minbill" inputMode="decimal" value={form.minBillRupees} onChange={(event) => update({ minBillRupees: event.target.value })} className={inputClass} />
          </Field>
          <Field id="group" label="Minimum group size" hint="People going, host included, before the coupon can be applied.">
            <input id="group" inputMode="numeric" value={form.minGroupSize} onChange={(event) => update({ minGroupSize: event.target.value })} className={inputClass} />
          </Field>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          Badge in the tray: <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold text-ink">{label}</span>
        </p>
      </div>

      <div>
        <p className={labelClass}>Terms</p>
        <ul className="space-y-2">
          {form.terms.map((term, index) => (
            <li key={index} className="flex gap-2">
              <input
                value={term}
                maxLength={120}
                onChange={(event) => update({ terms: form.terms.map((value, i) => (i === index ? event.target.value : value)) })}
                aria-label={`Term ${index + 1}`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => update({ terms: form.terms.filter((_, i) => i !== index) })}
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-md border border-line text-ink-muted hover:text-down"
                aria-label={`Remove term ${index + 1}`}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {form.terms.length < 6 ? (
          <button type="button" onClick={() => update({ terms: [...form.terms, ''] })} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-profile">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add a term
          </button>
        ) : null}
        <p className={hintClass}>Shown on the story and copied into the event the group creates.</p>
      </div>
      <Errors list={errors} />
    </div>
  );
}

function CreativeStep({ form, update, errors }: StepProps & { errors: string[] }) {
  return (
    <div className="space-y-5">
      <StepIntro
        title="Creative"
        body="A tall (9:16) image for the story. It also becomes the event cover unless you pick a separate one."
      />
      <div>
        <p className={labelClass}>Story image</p>
        <CreativeGrid selected={form.storyImageUrl} onSelect={(url, cover) => update({ storyImageUrl: url, ...(form.coverSameAsStory ? { coverImageUrl: cover } : {}) })} />
        <Field id="story-url" label="…or paste an image URL" hint="https only. TODO(backend): direct upload via file-upload-service (presigned S3).">
          <input id="story-url" value={form.storyImageUrl} onChange={(event) => update({ storyImageUrl: event.target.value })} className={`${inputClass} font-mono text-xs`} />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={form.coverSameAsStory}
          onChange={(event) => update({ coverSameAsStory: event.target.checked })}
          className="h-4 w-4 accent-[var(--profile)]"
        />
        Use the story image as the event cover
      </label>
      {!form.coverSameAsStory ? (
        <div>
          <p className={labelClass}>Event cover</p>
          <CreativeGrid selected={form.coverImageUrl} onSelect={(_, cover) => update({ coverImageUrl: cover })} useCover />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="event-type" label="Event type" hint="Pre-selected when someone creates an event from your offer.">
          <select id="event-type" value={form.eventType} onChange={(event) => update({ eventType: event.target.value })} className={inputClass}>
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.emoji} {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="event-name" label="Default event name">
          <input id="event-name" value={form.eventName} maxLength={60} onChange={(event) => update({ eventName: event.target.value })} className={inputClass} />
        </Field>
      </div>
      <Errors list={errors} />
    </div>
  );
}

function CreativeGrid({
  selected,
  onSelect,
  useCover = false,
}: {
  selected: string;
  onSelect: (storyUrl: string, coverUrl: string) => void;
  useCover?: boolean;
}) {
  return (
    <ul className="mb-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
      {DUMMY_CREATIVE_LIBRARY.map((item) => {
        const url = useCover ? item.coverImageUrl : item.storyImageUrl;
        const active = selected === url;
        return (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => onSelect(item.storyImageUrl, item.coverImageUrl)}
              aria-pressed={active}
              title={item.label}
              className={`block w-full overflow-hidden rounded-md ring-offset-2 ring-offset-surface transition ${
                active ? 'ring-2 ring-profile' : 'opacity-80 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.storyImageUrl.replace('w=1080', 'w=200')} alt={item.label} className={`w-full object-cover ${useCover ? 'aspect-video' : 'aspect-[9/16]'}`} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AudienceStep({
  form,
  update,
  outlets,
  estimate,
  tooNarrow,
  errors,
  showNarrow,
}: StepProps & {
  outlets: PartnerOutlet[];
  estimate: number | null;
  tooNarrow: boolean;
  errors: string[];
  showNarrow: boolean;
}) {
  const targeting = toTargeting(form);
  const issues = validateTargeting(targeting, geoName);
  const warnings = issues.filter((issue) => issue.level === 'warning');
  const outletDistricts = [...new Set(outlets.filter((outlet) => outlet.status === 'active').map((outlet) => outlet.districtId))];
  const includedStates = form.include.states ?? [];
  const canExclude = form.geoMode === 'all' || includedStates.length > 0;

  function toggleAge(bracket: AgeBracket) {
    update({
      ageBrackets: form.ageBrackets.includes(bracket)
        ? form.ageBrackets.filter((value) => value !== bracket)
        : AGE_BRACKETS.filter((value) => value === bracket || form.ageBrackets.includes(value)),
    });
  }

  return (
    <div className="space-y-6">
      <StepIntro
        title="Who should see it?"
        body="Offers are matched to each person’s home location in Lessgo (set at sign-up, changed only when they refresh it) plus their age and gender."
      />

      <div>
        <p className={labelClass}>Age</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={form.ageBrackets.length === 0} onClick={() => update({ ageBrackets: [] })}>
            All adults (18+)
          </Chip>
          {AGE_BRACKETS.map((bracket) => (
            <Chip key={bracket} active={form.ageBrackets.includes(bracket)} onClick={() => toggleAge(bracket)}>
              {formatAgeBracket(bracket)}
            </Chip>
          ))}
        </div>
        <p className={hintClass}>Under-18s never see offers.</p>
      </div>

      <div>
        <p className={labelClass}>Gender</p>
        <Segmented options={GENDER_OPTIONS} value={form.gender} onChange={(gender) => update({ gender })} />
      </div>

      <div>
        <p className={labelClass}>Where</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioCard
            checked={form.geoMode === 'all'}
            onChange={() => update({ geoMode: 'all', exclude: {} })}
            title="All of India"
            body="Everyone in the age/gender range, wherever they live."
          />
          <RadioCard
            checked={form.geoMode === 'custom'}
            onChange={() => update({ geoMode: 'custom', exclude: {} })}
            title="Specific states & districts"
            body="Pick whole states or individual districts."
          />
        </div>
      </div>

      {form.geoMode === 'custom' ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Show in</p>
            {outletDistricts.length ? (
              <button
                type="button"
                onClick={() =>
                  update({
                    include: {
                      ...form.include,
                      districts: [...new Set([...(form.include.districts ?? []), ...outletDistricts])].filter(
                        (id) => !(form.include.states ?? []).includes(id.split('-')[0]),
                      ),
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-profile"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Add my outlet districts
              </button>
            ) : null}
          </div>
          <GeoRulePicker tone="include" rule={form.include} onChange={(include) => update({ include, exclude: {} })} />
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Leave out <span className="font-normal text-ink-muted">(optional)</span></p>
        {canExclude ? (
          <GeoRulePicker
            tone="exclude"
            rule={form.exclude}
            onChange={(exclude) => update({ exclude })}
            limitToStates={form.geoMode === 'custom' ? includedStates : undefined}
            allowWholeState={form.geoMode === 'all'}
          />
        ) : (
          <p className="text-sm text-ink-muted">To leave out districts, include a whole state above first.</p>
        )}
      </div>

      {warnings.length ? (
        <ul className="space-y-1.5 rounded-md border border-warn bg-warn-tint px-4 py-3 text-sm text-ink">
          {warnings.map((issue) => (
            <li key={issue.message} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warn" aria-hidden="true" />
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className={`rounded-lg border p-4 ${tooNarrow ? 'border-down bg-down-tint' : 'border-line bg-bg-elev'}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Estimated audience</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-ink">
          {estimate === null ? '…' : tooNarrow ? `Under ${formatCount(PARTNER_PORTAL_CONFIG.minAudience)}` : `≈ ${formatCompact(estimate)}`}
          <span className="ml-2 text-base font-semibold text-ink-muted">people</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {tooNarrow
            ? `Audiences need at least ${formatCount(PARTNER_PORTAL_CONFIG.minAudience)} people so no one can be singled out. Widen it to continue.`
            : 'Rounded estimate of Lessgo users who match today. DUMMY numbers until the offers service is live.'}
        </p>
      </div>
      {showNarrow && tooNarrow ? <Errors list={['Widen the audience to at least 1,000 people.']} /> : null}
      <Errors list={errors} />
    </div>
  );
}

function RulesStep({ form, update, outlets, errors }: StepProps & { outlets: PartnerOutlet[]; errors: string[] }) {
  const example = /^[A-Z]{2,5}$/.test(form.codePrefix) ? buildVoucherCode(form.codePrefix, 'K7P2M9QX') : '—';
  const today = toDateInputValue(new Date().toISOString());
  return (
    <div className="space-y-6">
      <StepIntro
        title="Vouchers, limits and outlets"
        body="Every person who claims gets their own one-time code. Limits are enforced by Lessgo when codes are claimed."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="prefix" label="Code prefix" hint={`Codes look like ${example}`}>
          <input
            id="prefix"
            value={form.codePrefix}
            maxLength={5}
            onChange={(event) => update({ codePrefix: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
            className={`${inputClass} font-mono uppercase`}
          />
        </Field>
        <Field id="validity" label="Valid for (days after claiming)">
          <input id="validity" inputMode="numeric" value={form.validityDays} onChange={(event) => update({ validityDays: event.target.value })} className={inputClass} />
        </Field>
        <Field id="per-user" label="Vouchers per person">
          <input id="per-user" inputMode="numeric" value={form.perUserLimit} onChange={(event) => update({ perUserLimit: event.target.value })} className={inputClass} />
        </Field>
        <LimitField id="total-limit" label="Total redemptions" value={form.redemptionLimit} onChange={(redemptionLimit) => update({ redemptionLimit })} />
        <LimitField id="daily-limit" label="New vouchers per day" value={form.dailyLimit} onChange={(dailyLimit) => update({ dailyLimit })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="start" label="Starts">
          <input id="start" type="date" min={today} value={form.startDate} onChange={(event) => update({ startDate: event.target.value })} className={inputClass} />
        </Field>
        <Field id="end" label="Ends">
          <input id="end" type="date" min={form.startDate || today} value={form.endDate} onChange={(event) => update({ endDate: event.target.value })} className={inputClass} />
        </Field>
      </div>

      <div>
        <p className={labelClass}>Where can the event happen?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioCard checked={!form.restrictOutlets} onChange={() => update({ restrictOutlets: false })} title="Anywhere" body="Groups choose their own venue." />
          <RadioCard
            checked={form.restrictOutlets}
            onChange={() => update({ restrictOutlets: true })}
            title="Only at my outlets"
            body="The app’s location picker offers only these outlets, with map pins."
          />
        </div>
        {form.restrictOutlets ? (
          outlets.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              You have no outlets yet. <Link href="/partner/outlets" className="font-semibold text-profile">Add one</Link> first.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-md border border-line">
              {outlets.map((outlet) => (
                <li key={outlet.id}>
                  <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${outlet.status === 'paused' ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={outlet.status === 'paused'}
                      checked={form.outletIds.includes(outlet.id)}
                      onChange={() =>
                        update({
                          outletIds: form.outletIds.includes(outlet.id)
                            ? form.outletIds.filter((id) => id !== outlet.id)
                            : [...form.outletIds, outlet.id],
                        })
                      }
                      className="mt-0.5 h-4 w-4 accent-[var(--profile)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{outlet.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {outlet.address} · {geoName(outlet.districtId)}
                        {outlet.status === 'paused' ? ' · paused' : ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
      <Errors list={errors} />
    </div>
  );
}

function ReviewStep({
  form,
  update,
  draft,
  label,
  outlets,
  estimate,
  tooNarrow,
  errors,
  showConfirmError,
  onEdit,
}: StepProps & {
  draft: CampaignDraft;
  label: string;
  outlets: PartnerOutlet[];
  estimate: number | null;
  tooNarrow: boolean;
  errors: DraftErrors;
  showConfirmError: boolean;
  onEdit: (step: StepKey) => void;
}) {
  const blocking = (Object.entries(errors) as [DraftStep, string[]][]).filter(([, list]) => list.length);
  const chosenOutlets = outlets.filter((outlet) => draft.outletIds.includes(outlet.id));
  const include = ruleNames(draft.targeting.geo?.include);
  const exclude = ruleNames(draft.targeting.geo?.exclude);
  return (
    <div className="space-y-5">
      <StepIntro title="Review and submit" body="Lessgo checks the creative and terms, usually within one business day." />

      {blocking.length || tooNarrow ? (
        <div className="rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
          <p className="font-semibold">Fix these before submitting</p>
          <ul className="mt-2 space-y-1">
            {blocking.map(([step, list]) =>
              list.map((message) => (
                <li key={`${step}-${message}`}>
                  <button type="button" onClick={() => onEdit(step)} className="text-left underline-offset-2 hover:underline">
                    {STEPS.find((candidate) => candidate.key === step)?.label}: {message}
                  </button>
                </li>
              )),
            )}
            {tooNarrow ? (
              <li>
                <button type="button" onClick={() => onEdit('audience')} className="text-left underline-offset-2 hover:underline">
                  Audience: widen it to at least {formatCount(PARTNER_PORTAL_CONFIG.minAudience)} people.
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <ReviewBlock title="Offer" onEdit={() => onEdit('offer')}>
        <p className="font-semibold text-ink">
          {label} · {form.headline || '—'}
        </p>
        <p className="text-ink-muted">
          {describeOffer({ ...draft.offer, label })}
          {draft.offer.minBillMinor ? ` · minimum bill ${formatInr(draft.offer.minBillMinor)}` : ''} · groups of{' '}
          {draft.offer.minGroupSize}+
        </p>
      </ReviewBlock>
      <ReviewBlock title="Creative" onEdit={() => onEdit('creative')}>
        <p className="text-ink-muted">
          Event: {eventTypeLabel(form.eventType)} · “{form.eventName}”
        </p>
      </ReviewBlock>
      <ReviewBlock title="Audience" onEdit={() => onEdit('audience')}>
        <p className="text-ink">
          {describeAges(draft.targeting)} · {describeGender(draft.targeting)}
        </p>
        <p className="text-ink-muted">
          {include.length ? `In ${include.join(', ')}` : 'All of India'}
          {exclude.length ? ` · not in ${exclude.join(', ')}` : ''}
        </p>
        <p className="text-ink-muted">
          {estimate === null ? 'Estimating…' : tooNarrow ? 'Too narrow' : `≈ ${formatCompact(estimate)} people`}
        </p>
      </ReviewBlock>
      <ReviewBlock title="Vouchers & outlets" onEdit={() => onEdit('rules')}>
        <p className="text-ink-muted">
          <span className="font-mono">{form.codePrefix}-XXXX-XXXX-X</span> · valid {form.validityDays} days ·{' '}
          {draft.voucherPolicy.redemptionLimit ? `${formatCount(draft.voucherPolicy.redemptionLimit)} redemptions` : 'unlimited'} ·{' '}
          {draft.voucherPolicy.dailyLimit ? `${formatCount(draft.voucherPolicy.dailyLimit)}/day` : 'no daily cap'}
        </p>
        <p className="text-ink-muted">
          {draft.startAt && draft.endAt ? `${formatDate(draft.startAt)} – ${formatDate(draft.endAt)}` : 'Dates missing'} ·{' '}
          {chosenOutlets.length ? `${chosenOutlets.length} outlet${chosenOutlets.length > 1 ? 's' : ''}` : 'any venue'}
        </p>
      </ReviewBlock>

      <label className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${showConfirmError ? 'border-down' : 'border-line'}`}>
        <input
          type="checkbox"
          checked={form.confirmed}
          onChange={(event) => update({ confirmed: event.target.checked })}
          className="mt-0.5 h-4 w-4 accent-[var(--profile)]"
        />
        <span className="text-ink">
          The offer and terms are accurate, and our staff will honour valid Lessgo vouchers at the counter until they expire,
          even if we pause the campaign.
        </span>
      </label>
    </div>
  );
}

// ── Bits ────────────────────────────────────────────────────────────────────

function StepIntro({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

function LimitField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  const unlimited = value === '';
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          inputMode="numeric"
          value={value}
          disabled={unlimited}
          placeholder="Unlimited"
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
        <label className="flex flex-none items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(event) => onChange(event.target.checked ? '' : '100')}
            className="h-4 w-4 accent-[var(--profile)]"
          />
          No limit
        </label>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-bg-elev p-1" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${
            value === option.value ? 'bg-ink text-bg' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
        active ? 'border-profile bg-profile-tint text-ink' : 'border-line-strong text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function RadioCard({ checked, onChange, title, body }: { checked: boolean; onChange: () => void; title: string; body: string }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-md border px-4 py-3 transition-colors ${
        checked ? 'border-profile bg-profile-tint' : 'border-line hover:bg-surface-2'
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1 h-4 w-4 accent-[var(--profile)]" />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-ink-muted">{body}</span>
      </span>
    </label>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="rounded-md border border-line px-4 py-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-profile hover:underline">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function Errors({ list }: { list: string[] }) {
  if (list.length === 0) return null;
  return (
    <ul role="alert" className="space-y-1 rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
      {list.map((message) => (
        <li key={message} className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-down" aria-hidden="true" />
          {message}
        </li>
      ))}
    </ul>
  );
}

function ReachBadge({ estimate, tooNarrow }: { estimate: number | null; tooNarrow: boolean }) {
  return (
    <p className={`mx-auto mt-4 flex max-w-[300px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tooNarrow ? 'bg-down-tint text-down' : 'bg-surface-2 text-ink'}`}>
      <Users className="h-4 w-4" aria-hidden="true" />
      {estimate === null ? 'Estimating reach…' : tooNarrow ? 'Audience too narrow' : `≈ ${formatCompact(estimate)} people match`}
    </p>
  );
}
