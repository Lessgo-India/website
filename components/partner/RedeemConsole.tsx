'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  QrCode,
  RotateCcw,
  ScanLine,
  Store,
  TicketCheck,
  TicketX,
  Users,
} from 'lucide-react';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { formatDateTime, formatInr, formatRelative } from '@web/lib/partner/format';
import { createIdempotentAction } from '@web/lib/partner/idempotency';
import {
  demoVouchersFor,
  listPartnerOutlets,
  listPartnerRedemptions,
  lookupVoucher,
  redeemVoucher,
} from '@web/lib/partner/partnerApi';
import { computeDiscount, isRotatingCode, parseRedemptionInput, rupeesToMinor } from '@web/lib/partner/rules';
import type { PartnerRedemption, PartnerVoucherLookup } from '@web/lib/partner/types';
import { useSignedInPartner } from './PartnerSessionProvider';
import {
  Card,
  DemoTag,
  ErrorNote,
  hintClass,
  inputClass,
  labelClass,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui';
import { usePartnerQuery } from './usePartnerQuery';

type Phase =
  | { kind: 'input' }
  | { kind: 'found'; voucher: PartnerVoucherLookup; via: 'qr' | 'code' }
  | { kind: 'done'; voucher: PartnerVoucherLookup; redemption: PartnerRedemption };

export default function RedeemConsole() {
  const session = useSignedInPartner();
  const isCashier = session.user.role === 'cashier';
  const outletsQuery = usePartnerQuery(() => listPartnerOutlets(session), session.partner.id);
  const historyQuery = usePartnerQuery(async () => {
    const rows = await listPartnerRedemptions(session, { limit: 50 });
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return rows.filter((row) => Date.parse(row.redeemedAt) >= since);
  }, session.partner.id);
  const [chosenOutletId, setChosenOutletId] = useState('');
  const [input, setInput] = useState('');
  const [liveCode, setLiveCode] = useState('');
  const [bill, setBill] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'input' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // One Idempotency-Key per looked-up voucher, reused by every Confirm retry
  // until one succeeds or the console is reset.
  const [redeemAction] = useState(() => createIdempotentAction());
  const [demoVouchers, setDemoVouchers] = useState(() => demoVouchersFor(session));

  const outlets = useMemo(() => outletsQuery.data ?? [], [outletsQuery.data]);
  const activeOutlets = outlets.filter((outlet) => outlet.status === 'active');
  const outletId = isCashier ? session.user.outletId ?? '' : chosenOutletId || activeOutlets[0]?.id || '';
  const outlet = outlets.find((candidate) => candidate.id === outletId);
  const outletName = (id?: string) => outlets.find((candidate) => candidate.id === id)?.name ?? 'another outlet';

  async function lookup(raw: string) {
    setError(null);
    const parsed = parseRedemptionInput(raw);
    if (parsed.kind === 'invalid') {
      setError(parsed.reason);
      return;
    }
    setBusy(true);
    try {
      const voucher = await lookupVoucher(session, raw);
      redeemAction.restart();
      setPhase({ kind: 'found', voucher, via: parsed.kind });
      setLiveCode('');
      setBill('');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submitLookup(event: FormEvent) {
    event.preventDefault();
    void lookup(input);
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (phase.kind !== 'found') return;
    setError(null);
    const billMinor = rupeesToMinor(bill);
    if (!billMinor) {
      setError('Enter the bill amount before the discount.');
      return;
    }
    if (phase.via === 'code' && !isRotatingCode(liveCode)) {
      setError('Enter the 6-digit live code from the guest’s screen.');
      return;
    }
    if (!outletId) {
      setError('Pick the outlet you’re redeeming at.');
      return;
    }
    setBusy(true);
    try {
      const request = {
        voucherId: phase.voucher.voucherId,
        outletId,
        billMinor,
        ...(phase.via === 'code' ? { liveCode: liveCode.replace(/\s/g, '') } : {}),
      };
      const redemption = await redeemAction.attempt((idempotencyKey) =>
        redeemVoucher(session, request, { idempotencyKey }),
      );
      setPhase({ kind: 'done', voucher: phase.voucher, redemption });
      setDemoVouchers(demoVouchersFor(session));
      void historyQuery.reload();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    redeemAction.restart();
    setPhase({ kind: 'input' });
    setInput('');
    setLiveCode('');
    setBill('');
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const todaysRows = (historyQuery.data ?? []).filter((row) => row.outletId === outletId);

  return (
    <>
      <PageHeader
        title="Redeem a voucher"
        description="Scan the QR on the guest’s phone or type the code under it. The group’s Lessgo split updates as soon as you confirm."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <label htmlFor="redeem-outlet" className={labelClass}>
              Redeeming at
            </label>
            {isCashier ? (
              <p className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-bg-elev px-3.5 text-sm font-semibold text-ink">
                <Store className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                {outlet?.name ?? 'Your outlet'}
              </p>
            ) : (
              <select
                id="redeem-outlet"
                value={outletId}
                onChange={(event) => setChosenOutletId(event.target.value)}
                className={inputClass}
                disabled={phase.kind === 'done'}
              >
                {activeOutlets.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            )}
          </Card>

          {phase.kind === 'input' ? (
            <Card>
              <form onSubmit={submitLookup}>
                <label htmlFor="redeem-code" className={labelClass}>
                  Scan or type the code
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                    <input
                      id="redeem-code"
                      ref={inputRef}
                      autoFocus
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="BRB-7KQ4-M2XD-R"
                      className={`${inputClass} min-h-14 pl-11 font-mono text-lg tracking-wider`}
                    />
                  </div>
                  <button type="submit" disabled={busy} className={`${primaryButtonClass} min-h-14 px-7`}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Look up
                  </button>
                </div>
                <p className={hintClass}>
                  USB and Bluetooth scanners type straight into this box. Codes aren’t case-sensitive; O/0 and I/1 mix-ups are
                  fixed for you.
                </p>
                {/* TODO(backend): camera scanning via BarcodeDetector where supported. */}
              </form>
              {error ? (
                <div className="mt-4">
                  <ErrorNote message={error} />
                </div>
              ) : null}
            </Card>
          ) : null}

          {phase.kind === 'found' ? (
            <VoucherPanel
              voucher={phase.voucher}
              via={phase.via}
              outletId={outletId}
              outletName={outletName}
              liveCode={liveCode}
              setLiveCode={setLiveCode}
              bill={bill}
              setBill={setBill}
              busy={busy}
              error={error}
              onConfirm={confirm}
              onReset={reset}
            />
          ) : null}

          {phase.kind === 'done' ? (
            <Card className="border-ok">
              <div className="flex flex-col items-center py-4 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ok-tint">
                  <CheckCircle2 className="h-7 w-7 text-ok" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">Redeemed</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {phase.voucher.holderDisplayName}’s group · {phase.voucher.offer.label}
                </p>
                <dl className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3 text-center">
                  <Amount label="Bill" value={formatInr(phase.redemption.billMinor)} />
                  <Amount
                    label="Discount"
                    value={phase.redemption.discountMinor ? `−${formatInr(phase.redemption.discountMinor)}` : 'Freebie'}
                    tone="text-ok"
                  />
                  <Amount label="Collect" value={formatInr(phase.redemption.billMinor - phase.redemption.discountMinor)} strong />
                </dl>
                <p className="mt-6 max-w-md text-sm text-ink-muted">
                  The event in Lessgo now shows <span className="font-semibold text-ink">Coupon redeemed</span>, and the
                  group’s split already accounts for the discount. Reference{' '}
                  <span className="font-mono text-ink">{phase.redemption.id}</span>.
                </p>
                <button type="button" onClick={reset} className={`${primaryButtonClass} mt-6`}>
                  <ScanLine className="h-4 w-4" aria-hidden="true" />
                  Redeem another
                </button>
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card title="Last 24 hours here" action={<span className="text-xs text-ink-muted">{todaysRows.length}</span>}>
            {todaysRows.length === 0 ? (
              <p className="text-sm text-ink-muted">No redemptions at this outlet yet today.</p>
            ) : (
              <ul className="divide-y divide-line">
                {todaysRows.slice(0, 6).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs text-ink">{row.maskedCode}</span>
                      <span className="block text-xs text-ink-muted">
                        {formatRelative(row.redeemedAt)} · group of {row.groupSize}
                      </span>
                    </span>
                    <span className="flex-none font-semibold text-ok">
                      {row.discountMinor ? `−${formatInr(row.discountMinor)}` : 'Freebie'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {PARTNER_PORTAL_CONFIG.useDummyData && demoVouchers.length > 0 ? (
            <Card title="Try a demo voucher" action={<DemoTag />}>
              <p className="mb-3 text-xs text-ink-muted">
                Stand-ins for codes on guests’ phones. Vouchers claimed in the app prototype live on that device until the
                offers service exists.
              </p>
              <ul className="space-y-2">
                {demoVouchers.map((voucher) => (
                  <li key={voucher.voucherId} className="rounded-md border border-line px-3 py-2">
                    <p className="font-mono text-[13px] font-semibold text-ink">{voucher.code}</p>
                    <p className="text-xs text-ink-muted">
                      {voucher.status === 'redeemed' ? 'Already redeemed' : voucher.demoHint} · {voucher.holderDisplayName}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          reset();
                          setInput(voucher.code);
                        }}
                        className="inline-flex min-h-8 items-center rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:bg-surface-2"
                      >
                        Type code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          reset();
                          setInput(voucher.qrPayload);
                          void lookup(voucher.qrPayload);
                        }}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:bg-surface-2"
                      >
                        <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                        Simulate scan
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function VoucherPanel({
  voucher,
  via,
  outletId,
  outletName,
  liveCode,
  setLiveCode,
  bill,
  setBill,
  busy,
  error,
  onConfirm,
  onReset,
}: {
  voucher: PartnerVoucherLookup;
  via: 'qr' | 'code';
  outletId: string;
  outletName: (id?: string) => string;
  liveCode: string;
  setLiveCode: (value: string) => void;
  bill: string;
  setBill: (value: string) => void;
  busy: boolean;
  error: string | null;
  onConfirm: (event: FormEvent) => void;
  onReset: () => void;
}) {
  const billMinor = rupeesToMinor(bill);
  const quote = billMinor ? computeDiscount(voucher.offer, billMinor) : null;
  const ready = voucher.status === 'applied';
  const plannedElsewhere = !!voucher.outletId && voucher.outletId !== outletId;

  const status = {
    applied: { icon: TicketCheck, label: 'Ready to redeem', className: 'bg-ok-tint text-ok' },
    redeemed: { icon: TicketX, label: 'Already redeemed', className: 'bg-down-tint text-down' },
    expired: { icon: Clock3, label: 'Expired', className: 'bg-down-tint text-down' },
    attached: { icon: AlertTriangle, label: 'Not applied yet', className: 'bg-warn-tint text-warn' },
    claimed: { icon: AlertTriangle, label: 'Not used in an event', className: 'bg-warn-tint text-warn' },
  }[voucher.status];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>
          <status.icon className="h-4 w-4" aria-hidden="true" />
          {status.label}
        </span>
        <span className="font-mono text-sm text-ink-muted">{voucher.code}</span>
      </div>

      <p className="mt-4 text-xs font-extrabold tracking-wide text-ink-muted">{voucher.offer.label}</p>
      <h2 className="font-display text-xl font-bold text-ink">{voucher.campaignHeadline}</h2>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Detail icon={Users} label="Group">
          {voucher.holderDisplayName} (host) · {voucher.acceptedCount} going
        </Detail>
        <Detail icon={CalendarClock} label="Event">
          {voucher.eventName} · {formatDateTime(voucher.eventStartAt)}
        </Detail>
        <Detail icon={MapPin} label="Planned at">
          {voucher.outletId ? outletName(voucher.outletId) : 'Any venue'}
        </Detail>
        <Detail icon={Clock3} label="Valid until">
          {formatDateTime(voucher.validUntil)}
        </Detail>
      </dl>

      {voucher.status === 'redeemed' ? (
        <Explain>
          Redeemed {voucher.redeemedAt ? formatDateTime(voucher.redeemedAt) : 'earlier'}
          {voucher.redemptionId ? ` (ref ${voucher.redemptionId})` : ''}. Each voucher works once.
        </Explain>
      ) : null}
      {voucher.status === 'expired' ? <Explain>This voucher expired and can’t be redeemed.</Explain> : null}
      {voucher.status === 'attached' || voucher.status === 'claimed' ? (
        <Explain>
          The host needs to tap <span className="font-semibold">Apply coupon</span> in the event’s Expenses tab first. It takes
          a second — then scan again.
        </Explain>
      ) : null}

      {ready ? (
        <form onSubmit={onConfirm} className="mt-6 space-y-4 border-t border-line pt-5">
          {plannedElsewhere ? (
            <p className="flex gap-2 rounded-md border border-warn bg-warn-tint px-3 py-2 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warn" aria-hidden="true" />
              This group planned for {outletName(voucher.outletId)}. You can still redeem it here.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {via === 'code' ? (
              <div>
                <label htmlFor="live-code" className={labelClass}>
                  Live code
                </label>
                <input
                  id="live-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={liveCode}
                  onChange={(event) => setLiveCode(event.target.value.replace(/[^\d ]/g, ''))}
                  placeholder="123 456"
                  className={`${inputClass} font-mono tracking-widest`}
                />
                <p className={hintClass}>
                  The 6 digits under the guest’s QR — they change every 30 s, so screenshots don’t work.
                  {PARTNER_PORTAL_CONFIG.useDummyData ? ' Demo: any 6 digits.' : ''}
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 self-center text-sm text-ink-muted">
                <QrCode className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                Scanned QR — live code verified.
              </p>
            )}
            <div>
              <label htmlFor="bill" className={labelClass}>
                Bill before discount (₹)
              </label>
              <input
                id="bill"
                inputMode="decimal"
                autoFocus={via === 'qr'}
                value={bill}
                onChange={(event) => setBill(event.target.value)}
                placeholder="1,450"
                className={`${inputClass} text-lg`}
              />
            </div>
          </div>

          {quote ? (
            quote.eligible ? (
              <div className="rounded-md bg-bg-elev px-4 py-3">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  <Amount label="Bill" value={formatInr(billMinor ?? 0)} />
                  <Amount label="Discount" value={quote.discountMinor ? `−${formatInr(quote.discountMinor)}` : '—'} tone="text-ok" />
                  <Amount label="Collect" value={formatInr(quote.payableMinor)} strong />
                </dl>
                {quote.note ? <p className="mt-2 text-center text-sm text-ink">{quote.note}</p> : null}
              </div>
            ) : (
              <p className="text-sm font-medium text-down">{quote.note}</p>
            )
          ) : null}

          {error ? <ErrorNote message={error} /> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || (quote ? !quote.eligible : false)} className={primaryButtonClass}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Confirm redemption
            </button>
            <button type="button" onClick={onReset} disabled={busy} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={onReset} className={`${secondaryButtonClass} mt-6`}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Look up another
        </button>
      )}
    </Card>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-ink-faint" aria-hidden="true" />
      <div>
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className="text-ink">{children}</dd>
      </div>
    </div>
  );
}

function Explain({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 rounded-md bg-surface-2 px-4 py-3 text-sm text-ink">{children}</p>;
}

function Amount({ label, value, tone = 'text-ink', strong = false }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 font-display ${strong ? 'text-xl font-extrabold' : 'text-base font-bold'} ${tone}`}>{value}</dd>
    </div>
  );
}
