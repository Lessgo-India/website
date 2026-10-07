'use client';

import { useId, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getGeoState, INDIA_GEO } from '@web/lib/partner/indiaGeo';
import { districtState } from '@web/lib/partner/rules';
import { geoName } from '@web/lib/partner/targetingText';
import type { OfferGeoRule } from '@web/lib/partner/types';
import { inputClass } from './ui';

interface GeoRulePickerProps {
  tone: 'include' | 'exclude';
  rule: OfferGeoRule;
  onChange: (rule: OfferGeoRule) => void;
  /** Only these states can be picked (exclusions inside included states). */
  limitToStates?: readonly string[];
  /** Whether a whole state can be picked (not when excluding inside an included state). */
  allowWholeState?: boolean;
}

/** State → district picker used for both "show in" and "leave out" rules. */
export default function GeoRulePicker({
  tone,
  rule,
  onChange,
  limitToStates,
  allowWholeState = true,
}: GeoRulePickerProps) {
  const id = useId();
  const [stateCode, setStateCode] = useState('');
  const [search, setSearch] = useState('');
  const states = useMemo(
    () => (limitToStates ? INDIA_GEO.filter((state) => limitToStates.includes(state.code)) : INDIA_GEO),
    [limitToStates],
  );
  const selectedStates = rule.states ?? [];
  const selectedDistricts = rule.districts ?? [];
  const current = stateCode ? getGeoState(stateCode) : undefined;
  const wholeStateSelected = !!current && selectedStates.includes(current.code);
  const query = search.trim().toLowerCase();
  const districts = current?.districts.filter((district) => district.name.toLowerCase().includes(query)) ?? [];

  const emit = (nextStates: string[], nextDistricts: string[]) =>
    onChange({
      ...(nextStates.length ? { states: nextStates } : {}),
      ...(nextDistricts.length ? { districts: nextDistricts } : {}),
    });

  function toggleWholeState(code: string) {
    if (selectedStates.includes(code)) {
      emit(selectedStates.filter((value) => value !== code), selectedDistricts);
    } else {
      // A whole state makes its individual districts redundant.
      emit([...selectedStates, code], selectedDistricts.filter((value) => districtState(value) !== code));
    }
  }

  function toggleDistrict(districtId: string) {
    emit(
      selectedStates,
      selectedDistricts.includes(districtId)
        ? selectedDistricts.filter((value) => value !== districtId)
        : [...selectedDistricts, districtId],
    );
  }

  function remove(value: string) {
    emit(
      selectedStates.filter((code) => code !== value),
      selectedDistricts.filter((districtId) => districtId !== value),
    );
  }

  const chipClass = tone === 'include' ? 'bg-groups-tint text-groups' : 'bg-down-tint text-down';
  const chips = [
    ...selectedStates.map((code) => ({ value: code, label: `${getGeoState(code)?.name ?? code} · whole state` })),
    ...selectedDistricts.map((districtId) => ({ value: districtId, label: geoName(districtId) })),
  ];

  return (
    <div>
      {chips.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-1.5" aria-label={tone === 'include' ? 'Included regions' : 'Excluded regions'}>
          {chips.map((chip) => (
            <li key={chip.value} className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-xs font-semibold ${chipClass}`}>
              {chip.label}
              <button
                type="button"
                onClick={() => remove(chip.value)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"
                aria-label={`Remove ${chip.label}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label htmlFor={`${id}-state`} className="sr-only">
        State or union territory
      </label>
      <select
        id={`${id}-state`}
        value={stateCode}
        onChange={(event) => {
          setStateCode(event.target.value);
          setSearch('');
        }}
        className={inputClass}
      >
        <option value="">{tone === 'include' ? 'Add a state or its districts…' : 'Leave out a state or district…'}</option>
        <optgroup label="States">
          {states
            .filter((state) => state.type === 'state')
            .map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
        </optgroup>
        <optgroup label="Union territories">
          {states
            .filter((state) => state.type === 'ut')
            .map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
        </optgroup>
      </select>

      {current ? (
        <div className="mt-2 rounded-md border border-line bg-bg-elev p-3">
          {allowWholeState ? (
            <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={wholeStateSelected}
                onChange={() => toggleWholeState(current.code)}
                className="h-4 w-4 accent-[var(--profile)]"
              />
              All of {current.name}
              <span className="font-normal text-ink-muted">({current.districts.length} districts)</span>
            </label>
          ) : null}
          {!wholeStateSelected ? (
            <>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${current.districts.length} districts`}
                  aria-label={`Search districts in ${current.name}`}
                  className={`${inputClass} pl-9`}
                />
              </div>
              <ul className="mt-2 grid max-h-56 gap-x-4 overflow-y-auto pr-1 sm:grid-cols-2">
                {districts.map((district) => (
                  <li key={district.id}>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={selectedDistricts.includes(district.id)}
                        onChange={() => toggleDistrict(district.id)}
                        className="h-4 w-4 accent-[var(--profile)]"
                      />
                      {district.name}
                    </label>
                  </li>
                ))}
                {districts.length === 0 ? <li className="py-2 text-sm text-ink-muted">No district matches “{search}”.</li> : null}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">Every district in {current.name} is covered.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
