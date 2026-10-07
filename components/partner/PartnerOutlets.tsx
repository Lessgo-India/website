'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, ExternalLink, Loader2, MapPin, Pause, Play, Plus, Store, X } from 'lucide-react';
import { getGeoDistrict, getGeoState, INDIA_GEO, normalisePincode, statesForPincode } from '@web/lib/partner/indiaGeo';
import {
  createPartnerOutlet,
  listPartnerCampaigns,
  listPartnerOutlets,
  outletPinWarning,
  outletProblem,
  setOutletStatus,
  type OutletInput,
} from '@web/lib/partner/partnerApi';
import { can } from '@web/lib/partner/rules';
import { geoName } from '@web/lib/partner/targetingText';
import type { PartnerOutlet } from '@web/lib/partner/types';
import { useSignedInPartner } from './PartnerSessionProvider';
import {
  Card,
  EmptyState,
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

export default function PartnerOutlets() {
  const session = useSignedInPartner();
  const canWrite = can(session.user.role, 'outlets.write');
  const query = usePartnerQuery(async () => {
    const [outlets, campaigns] = await Promise.all([listPartnerOutlets(session), listPartnerCampaigns(session)]);
    return { outlets, campaigns };
  }, session.partner.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const outlets = useMemo(() => query.data?.outlets ?? [], [query.data]);
  const selected = outlets.find((outlet) => outlet.id === selectedId) ?? outlets[0];
  const liveUse = (outletId: string) =>
    (query.data?.campaigns ?? []).filter(
      (campaign) => ['live', 'scheduled', 'paused'].includes(campaign.status) && campaign.outletIds.includes(outletId),
    ).length;

  async function toggle(outlet: PartnerOutlet) {
    setBusyId(outlet.id);
    setActionError(null);
    try {
      const updated = await setOutletStatus(session, outlet.id, outlet.status === 'active' ? 'paused' : 'active');
      query.setData((current) =>
        current ? { ...current, outlets: current.outlets.map((item) => (item.id === updated.id ? { ...updated } : item)) } : current,
      );
    } catch (caught) {
      setActionError((caught as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Outlets"
        description="Venues where groups can redeem. When a campaign is limited to outlets, the app’s location picker shows only these, with map pins."
        actions={
          canWrite && !adding ? (
            <button type="button" onClick={() => setAdding(true)} className={primaryButtonClass}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add outlet
            </button>
          ) : null
        }
      />
      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}
      {actionError ? (
        <div className="mb-4">
          <ErrorNote message={actionError} />
        </div>
      ) : null}
      {!query.data && query.loading ? <LoadingBlock /> : null}

      {adding ? (
        <div className="mb-6">
          <AddOutletForm
            onCancel={() => setAdding(false)}
            onCreated={(outlet) => {
              query.setData((current) => (current ? { ...current, outlets: [...current.outlets, outlet] } : current));
              setSelectedId(outlet.id);
              setAdding(false);
            }}
          />
        </div>
      ) : null}

      {query.data ? (
        outlets.length === 0 ? (
          <EmptyState icon={Store} title="No outlets yet" body="Add the places where your staff will redeem Lessgo vouchers." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <ul className="space-y-3">
              {outlets.map((outlet) => {
                const active = outlet.id === selected?.id;
                const uses = liveUse(outlet.id);
                return (
                  <li key={outlet.id}>
                    <div
                      className={`rounded-lg border bg-surface p-4 shadow-soft transition-colors ${active ? 'border-profile' : 'border-line'}`}
                    >
                      <button type="button" onClick={() => setSelectedId(outlet.id)} className="flex w-full items-start gap-3 text-left">
                        <MapPin className={`mt-0.5 h-5 w-5 flex-none ${outlet.status === 'active' ? 'text-events' : 'text-ink-faint'}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{outlet.name}</span>
                            {outlet.status === 'paused' ? (
                              <span className="rounded-full bg-warn-tint px-2 py-0.5 text-[11px] font-semibold text-warn">Paused</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-muted">
                            {outlet.address} – {outlet.pincode}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {geoName(outlet.districtId)} · {outlet.coordinates[0].toFixed(4)}, {outlet.coordinates[1].toFixed(4)}
                          </span>
                          <span className="mt-1 block text-xs text-ink-muted">
                            {uses ? `Venue for ${uses} campaign${uses > 1 ? 's' : ''}` : 'Not used by a running campaign'}
                          </span>
                        </span>
                      </button>
                      {canWrite ? (
                        <div className="mt-3 flex justify-end border-t border-line pt-3">
                          <button
                            type="button"
                            onClick={() => toggle(outlet)}
                            disabled={busyId === outlet.id}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
                          >
                            {busyId === outlet.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : outlet.status === 'active' ? (
                              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {outlet.status === 'active' ? 'Pause outlet' : 'Reactivate'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {selected ? (
              <div className="xl:sticky xl:top-8 xl:self-start">
                <Card title={selected.name}>
                  <OutletMap coordinates={selected.coordinates} label={selected.name} />
                </Card>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </>
  );
}

export function OutletMap({ coordinates, label }: { coordinates: readonly [number, number]; label: string }) {
  const [lat, lng] = coordinates;
  const span = 0.012;
  // TODO: swap for the maps provider the app uses once a web key exists; OSM's embed needs none.
  const src =
    'https://www.openstreetmap.org/export/embed.html?' +
    `bbox=${lng - span}%2C${lat - span * 0.6}%2C${lng + span}%2C${lat + span * 0.6}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div>
      <iframe
        key={`${lat},${lng}`}
        title={`Map of ${label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="h-80 w-full rounded-md border border-line bg-surface-2"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-profile hover:underline"
      >
        Open in Google Maps <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );
}

function AddOutletForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (outlet: PartnerOutlet) => void }) {
  const session = useSignedInPartner();
  const [name, setName] = useState(`${session.partner.brandName} – `);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinStates = pincode.length === 6 ? statesForPincode(pincode) : [];
  const state = stateCode ? getGeoState(stateCode) : undefined;
  const coordinates: [number, number] | null = lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)) ? [Number(lat), Number(lng)] : null;
  const pinWarning = coordinates && districtId ? outletPinWarning({ districtId, coordinates }) : null;

  function changePincode(value: string) {
    const pin = normalisePincode(value);
    setPincode(pin);
    const candidates = pin.length === 6 ? statesForPincode(pin) : [];
    if (candidates.length === 1 && candidates[0].code !== stateCode) {
      setStateCode(candidates[0].code);
      setDistrictId('');
    }
  }

  function changeDistrict(id: string) {
    setDistrictId(id);
    const district = getGeoDistrict(id);
    if (district) {
      setLat(district.centroid[0].toFixed(4));
      setLng(district.centroid[1].toFixed(4));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!coordinates) {
      setError('Drop the pin: pick a district or enter latitude and longitude.');
      return;
    }
    const input: OutletInput = { name, address, pincode, stateCode, districtId, coordinates };
    const problem = outletProblem(input);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      onCreated(await createPartnerOutlet(session, input));
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card
      title="Add an outlet"
      action={
        <button type="button" onClick={onCancel} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2" aria-label="Close">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    >
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <label htmlFor="outlet-name" className={labelClass}>
              Outlet name
            </label>
            <input id="outlet-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="outlet-address" className={labelClass}>
              Street address
            </label>
            <input id="outlet-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Building, street, area" className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="outlet-pin" className={labelClass}>
                PIN code
              </label>
              <input id="outlet-pin" inputMode="numeric" value={pincode} onChange={(event) => changePincode(event.target.value)} placeholder="560038" className={`${inputClass} font-mono`} />
              <p className={hintClass}>
                {pincode.length < 6
                  ? 'Six digits; we detect the state.'
                  : pinStates.length === 0
                    ? 'Not a valid Indian PIN code.'
                    : pinStates.length === 1
                      ? `PIN is in ${pinStates[0].name}.`
                      : `Shared by ${pinStates.map((candidate) => candidate.name).join(' and ')} — pick the state.`}
              </p>
            </div>
            <div>
              <label htmlFor="outlet-state" className={labelClass}>
                State / UT
              </label>
              <select
                id="outlet-state"
                value={stateCode}
                onChange={(event) => {
                  setStateCode(event.target.value);
                  setDistrictId('');
                }}
                className={inputClass}
              >
                <option value="">Choose…</option>
                {INDIA_GEO.map((candidate) => (
                  <option key={candidate.code} value={candidate.code}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="outlet-district" className={labelClass}>
              District
            </label>
            <select id="outlet-district" value={districtId} onChange={(event) => changeDistrict(event.target.value)} disabled={!state} className={inputClass}>
              <option value="">{state ? 'Choose…' : 'Pick a state first'}</option>
              {state?.districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="outlet-lat" className={labelClass}>
                Latitude
              </label>
              <input id="outlet-lat" inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label htmlFor="outlet-lng" className={labelClass}>
                Longitude
              </label>
              <input id="outlet-lng" inputMode="decimal" value={lng} onChange={(event) => setLng(event.target.value)} className={`${inputClass} font-mono`} />
            </div>
          </div>
          <p className={hintClass}>
            Picking a district drops the pin at its centre — paste the exact coordinates from Google Maps (right-click → copy) so
            groups find the door. TODO(backend): drag-to-place pin + server geocoding.
          </p>
          {pinWarning ? (
            <p role="status" className="flex gap-2 rounded-md border border-warn bg-warn-tint px-3 py-2 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warn" aria-hidden="true" />
              {pinWarning}
            </p>
          ) : null}
          {error ? <ErrorNote message={error} /> : null}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              Save outlet
            </button>
            <button type="button" onClick={onCancel} disabled={busy} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
        <div>
          {coordinates ? (
            <OutletMap coordinates={coordinates} label={name || 'new outlet'} />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-md border border-dashed border-line-strong text-sm text-ink-muted">
              Pick a district to drop the pin
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
