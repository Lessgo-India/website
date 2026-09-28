"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Globe2,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  X,
} from "lucide-react";
import {
  editableCatalogue,
  getRegionalOptions,
  getRegionalState,
  publishRegionalDraft,
  restoreRegionalDraft,
  saveRegionalDraft,
  type RegionalAdminState,
  type RegionalCountry,
  type RegionalDraft,
  type RegionalOptions,
  type RegionalPaymentMethod,
} from "@web/lib/regionalConfigApi";

const inputClass =
  "min-h-11 w-full min-w-0 rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60";
const commandClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";
const iconClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 disabled:opacity-50";
const identifierLabels = {
  upi: "UPI ID",
  handle: "Handle",
  email: "Email",
  phone: "Phone",
  email_or_phone: "Email or phone",
};

function formatPreview(
  country: RegionalCountry,
  options: RegionalOptions,
): string {
  try {
    const precision =
      options.currencies.find((entry) => entry.code === country.defaultCurrency)
        ?.minorUnits ?? 2;
    return new Intl.NumberFormat(country.defaultLocale, {
      style: "currency",
      currency: country.defaultCurrency,
      currencyDisplay: "code",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(1234.5);
  } catch {
    return "Invalid locale or currency";
  }
}

export default function CountryManager() {
  const [state, setState] = useState<RegionalAdminState | null>(null);
  const [options, setOptions] = useState<RegionalOptions | null>(null);
  const [draft, setDraft] = useState<RegionalDraft | null>(null);
  const [selected, setSelected] = useState("IN");
  const [search, setSearch] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newMethodId, setNewMethodId] = useState("");
  const [newMethodName, setNewMethodName] = useState("");
  const [busy, setBusy] = useState<
    "load" | "save" | "publish" | "restore" | null
  >("load");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const loadGeneration = useRef(0);

  function load() {
    const generation = ++loadGeneration.current;
    return Promise.all([getRegionalState(), getRegionalOptions()])
      .then(([nextState, nextOptions]) => {
        if (generation !== loadGeneration.current) return;
        setState(nextState);
        setOptions(nextOptions);
        const nextDraft = editableCatalogue(nextState);
        setDraft(nextDraft);
        setSelected((current) =>
          nextDraft.countries.some((entry) => entry.code === current)
            ? current
            : (nextDraft.countries[0]?.code ?? ""),
        );
        setDirty(false);
        setConfirmPublish(false);
      })
      .catch((failure: unknown) => {
        if (generation === loadGeneration.current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load country settings.",
          );
      })
      .finally(() => {
        if (generation === loadGeneration.current) setBusy(null);
      });
  }

  function reload() {
    setBusy("load");
    setError(null);
    setNotice(null);
    void load();
  }

  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (confirmPublish) publishDialog.current?.showModal();
    else publishDialog.current?.close();
  }, [confirmPublish]);

  async function mutate(
    action: "save" | "publish" | "restore",
    sourceRevision?: number,
  ) {
    if (!state || !draft || !state.canEdit || inFlight.current) return;
    inFlight.current = true;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const result =
        action === "save"
          ? await saveRegionalDraft(draft, state.revision)
          : action === "publish"
            ? await publishRegionalDraft(state.revision)
            : await restoreRegionalDraft(sourceRevision!, state.revision);
      setState({ ...result, canEdit: state.canEdit });
      setDraft(editableCatalogue(result));
      setDirty(false);
      setConfirmPublish(false);
      setNotice(
        action === "save"
          ? "Draft saved."
          : action === "publish"
            ? "Country catalogue published."
            : "Previous revision restored as a draft.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The change could not be saved.",
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  function editCountry(patch: Partial<RegionalCountry>) {
    setDraft(
      (current) =>
        current && {
          ...current,
          countries: current.countries.map((entry) =>
            entry.code === selected ? { ...entry, ...patch } : entry,
          ),
        },
    );
    setDirty(true);
    setConfirmPublish(false);
    setNotice(null);
  }

  function editMethod(id: string, patch: Partial<RegionalPaymentMethod>) {
    setDraft(
      (current) =>
        current && {
          ...current,
          paymentMethods: current.paymentMethods.map((entry) =>
            entry.id === id ? { ...entry, ...patch } : entry,
          ),
        },
    );
    setDirty(true);
    setConfirmPublish(false);
    setNotice(null);
  }

  function addCountry() {
    if (
      !draft ||
      !newCountry ||
      draft.countries.some((entry) => entry.code === newCountry)
    )
      return;
    setDraft({
      ...draft,
      countries: [
        ...draft.countries,
        {
          code: newCountry,
          defaultLocale: `en-${newCountry}`,
          defaultCurrency: "",
          paymentMethodIds: [],
          onboardingEnabled: false,
        },
      ],
    });
    setSelected(newCountry);
    setNewCountry("");
    setDirty(true);
    setConfirmPublish(false);
  }

  function addMethod() {
    if (
      !draft ||
      !/^[a-z][a-z0-9_-]{0,39}$/.test(newMethodId) ||
      !newMethodName.trim()
    ) {
      setError(
        "Enter a payment name and an ID using lowercase letters, numbers, underscores or hyphens.",
      );
      return;
    }
    if (draft.paymentMethods.some((entry) => entry.id === newMethodId)) {
      setError("That payment method ID already exists.");
      return;
    }
    const country = draft.countries.find((entry) => entry.code === selected);
    setDraft({
      ...draft,
      paymentMethods: [
        ...draft.paymentMethods,
        {
          id: newMethodId,
          name: newMethodName.trim(),
          label: `${newMethodName.trim()} ID`,
          placeholder: "Your payment ID",
          identifierKind: "handle",
          action: "copy",
          currencies: country?.defaultCurrency ? [country.defaultCurrency] : [],
          enabled: true,
        },
      ],
    });
    setNewMethodId("");
    setNewMethodName("");
    setDirty(true);
    setConfirmPublish(false);
    setError(null);
  }

  const country = draft?.countries.find((entry) => entry.code === selected);
  const countryInfo = options?.countries.find(
    (entry) => entry.code === selected,
  );
  const locked = !state?.canEdit || busy !== null;
  const visibleCountries =
    draft?.countries.filter((entry) => {
      const metadata = options?.countries.find(
        (item) => item.code === entry.code,
      );
      return `${metadata?.name ?? ""} ${entry.code}`
        .toLowerCase()
        .includes(search.toLowerCase());
    }) ?? [];
  const cannotActivate =
    country &&
    state &&
    !state.activationPolicy.internationalReady &&
    (!state.activationPolicy.activeCountryCodes.includes(country.code) ||
      !state.activationPolicy.activeCurrencies.includes(
        country.defaultCurrency,
      ));

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-bold uppercase text-gold">Configuration</p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-2xl font-bold">
            <Globe2 className="h-6 w-6 text-gold" aria-hidden="true" />
            Countries
          </h1>
          <p className="mt-1 text-xs text-ink-muted">
            {state
              ? `Published revision ${state.published.revision} · ${state.draft ? "Saved draft" : "No saved draft"}${dirty ? " · Unsaved changes" : ""}`
              : "Loading catalogue"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Reload catalogue"
            aria-label="Reload catalogue"
            className={iconClass}
            disabled={busy !== null}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard unsaved changes and reload?")
              )
                reload();
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ${busy === "load" ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            className={commandClass}
            disabled={locked || !dirty}
            onClick={() => void mutate("save")}
          >
            <Save className="h-4 w-4" />
            {busy === "save" ? "Saving" : "Save draft"}
          </button>
          <button
            type="button"
            className={`${commandClass} border-gold bg-gold text-bg hover:opacity-90`}
            disabled={locked || dirty || !state?.draft}
            onClick={() => setConfirmPublish(true)}
          >
            <Send className="h-4 w-4" />
            Publish
          </button>
        </div>
      </header>

      <div aria-live="polite" className="mt-4 space-y-2">
        {error ? (
          <p
            role="alert"
            className="break-words border-l-2 border-down bg-down-tint px-4 py-3 text-sm"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="flex items-center gap-2 text-sm text-ok">
            <Check className="h-4 w-4" />
            {notice}
          </p>
        ) : null}
        {state && !state.canEdit ? (
          <p className="text-sm text-ink-muted">Read-only access</p>
        ) : null}
        {state && !state.activationPolicy.internationalReady ? (
          <p className="border-l-2 border-warn bg-warn-tint px-4 py-3 text-sm">
            International activation locked: phone identity and currency
            migration pending.
          </p>
        ) : null}
      </div>

      {!draft || !options || !state ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-ink-muted">
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading countries
            </>
          ) : (
            <button className={commandClass} onClick={reload}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-4 lg:border-r lg:border-line lg:pr-6">
              <label className="block text-xs font-semibold text-ink-muted">
                Search countries
                <input
                  aria-label="Search countries"
                  className={`${inputClass} mt-2`}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <nav
                aria-label="Configured countries"
                className="max-h-80 space-y-1 overflow-y-auto"
              >
                {visibleCountries.map((entry) => (
                  <button
                    key={entry.code}
                    type="button"
                    onClick={() => setSelected(entry.code)}
                    aria-current={entry.code === selected ? "page" : undefined}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm ${entry.code === selected ? "bg-gold-tint font-semibold text-ink" : "text-ink-muted hover:bg-surface-2"}`}
                  >
                    <span className="min-w-0 break-words">
                      {options.countries.find(
                        (item) => item.code === entry.code,
                      )?.name ?? entry.code}
                    </span>
                    <span
                      className={`shrink-0 text-xs ${entry.onboardingEnabled ? "text-ok" : "text-ink-faint"}`}
                    >
                      {entry.onboardingEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </button>
                ))}
                {!visibleCountries.length ? (
                  <p className="py-4 text-sm text-ink-muted">
                    No matching countries
                  </p>
                ) : null}
              </nav>
              <div className="flex gap-2 border-t border-line pt-4">
                <select
                  aria-label="Add country"
                  className={inputClass}
                  disabled={locked}
                  value={newCountry}
                  onChange={(event) => setNewCountry(event.target.value)}
                >
                  <option value="">Choose country</option>
                  {options.countries
                    .filter(
                      (entry) =>
                        !draft.countries.some(
                          (saved) => saved.code === entry.code,
                        ),
                    )
                    .map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.name} ({entry.callingCode})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  title="Add country"
                  aria-label="Add country"
                  className={iconClass}
                  disabled={locked || !newCountry}
                  onClick={addCountry}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </aside>

            {country ? (
              <section className="min-w-0">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-display text-xl font-bold">
                    {countryInfo?.name ?? country.code}{" "}
                    <span className="ml-2 text-sm font-normal text-ink-muted">
                      {country.code} · {countryInfo?.callingCode}
                    </span>
                  </h2>
                  <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={country.onboardingEnabled}
                      disabled={locked || Boolean(cannotActivate)}
                      onChange={(event) =>
                        editCountry({ onboardingEnabled: event.target.checked })
                      }
                    />
                    Onboarding enabled
                  </label>
                </div>
                <fieldset
                  disabled={locked}
                  className="grid min-w-0 gap-5 sm:grid-cols-2"
                >
                  <label className="block text-sm font-semibold">
                    Formatting locale
                    <input
                      className={`${inputClass} mt-2`}
                      value={country.defaultLocale}
                      maxLength={35}
                      onChange={(event) =>
                        editCountry({ defaultLocale: event.target.value })
                      }
                      placeholder="en-SG"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Default currency
                    <select
                      aria-label="Default currency"
                      className={`${inputClass} mt-2`}
                      value={country.defaultCurrency}
                      onChange={(event) =>
                        editCountry({ defaultCurrency: event.target.value })
                      }
                    >
                      <option value="">Choose currency</option>
                      {options.currencies.map((entry) => (
                        <option key={entry.code} value={entry.code}>
                          {entry.code} · {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                <fieldset
                  disabled={locked}
                  className="mt-6 border-t border-line pt-5"
                >
                  <legend className="pr-3 text-sm font-semibold">
                    Payment methods
                  </legend>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {draft.paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className="flex min-h-11 items-center gap-2 text-sm"
                      >
                        <input
                          className="h-4 w-4 accent-gold"
                          type="checkbox"
                          checked={country.paymentMethodIds.includes(method.id)}
                          onChange={(event) =>
                            editCountry({
                              paymentMethodIds: event.target.checked
                                ? [...country.paymentMethodIds, method.id]
                                : country.paymentMethodIds.filter(
                                    (id) => id !== method.id,
                                  ),
                            })
                          }
                        />
                        {method.name}
                        {!method.enabled ? " (disabled)" : ""}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <section
                  aria-label="Country preview"
                  className="mt-6 rounded-md border border-line bg-surface p-5"
                >
                  <h3 className="text-xs font-bold uppercase text-ink-muted">
                    Preview
                  </h3>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-ink-muted">Phone country</p>
                      <p className="mt-1 text-sm font-semibold">
                        {countryInfo?.name} {countryInfo?.callingCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">Amount</p>
                      <p className="mt-1 break-words font-mono text-lg">
                        {formatPreview(country, options)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {country.paymentMethodIds
                      .map((id) =>
                        draft.paymentMethods.find((method) => method.id === id),
                      )
                      .filter((method): method is RegionalPaymentMethod =>
                        Boolean(method),
                      )
                      .map((method) => (
                        <label key={method.id} className="block text-sm">
                          {method.label}
                          <input
                            aria-label={`Preview ${method.label}`}
                            className={`${inputClass} mt-1`}
                            placeholder={method.placeholder}
                            readOnly
                            tabIndex={-1}
                          />
                          <span className="mt-1 block text-xs text-ink-muted">
                            {identifierLabels[method.identifierKind]} ·{" "}
                            {method.action === "upi"
                              ? "Copy or open UPI"
                              : "Copy"}{" "}
                            · {method.currencies.join(", ")}
                          </span>
                        </label>
                      ))}
                  </div>
                </section>
              </section>
            ) : null}
          </div>

          <section
            className="mt-10 border-t border-line pt-6"
            aria-labelledby="payment-definitions-title"
          >
            <h2
              id="payment-definitions-title"
              className="font-display text-lg font-bold"
            >
              Payment definitions
            </h2>
            <div className="mt-4 divide-y divide-line">
              {draft.paymentMethods.map((method) => {
                const published = state.published.paymentMethods.find(
                  (entry) => entry.id === method.id,
                );
                return (
                  <fieldset
                    key={method.id}
                    disabled={locked}
                    className="min-w-0 py-5"
                  >
                    <legend className="pt-4 font-mono text-xs text-ink-muted">
                      {method.id}
                    </legend>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <label className="text-sm">
                        Name
                        <input
                          className={`${inputClass} mt-1`}
                          aria-label={`${method.id} name`}
                          maxLength={80}
                          value={method.name}
                          onChange={(event) =>
                            editMethod(method.id, { name: event.target.value })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        Field label
                        <input
                          className={`${inputClass} mt-1`}
                          aria-label={`${method.id} field label`}
                          maxLength={80}
                          value={method.label}
                          onChange={(event) =>
                            editMethod(method.id, { label: event.target.value })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        Example
                        <input
                          className={`${inputClass} mt-1`}
                          aria-label={`${method.id} example`}
                          maxLength={120}
                          value={method.placeholder}
                          onChange={(event) =>
                            editMethod(method.id, {
                              placeholder: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        Identifier type
                        <select
                          className={`${inputClass} mt-1`}
                          aria-label={`${method.id} identifier type`}
                          disabled={locked || Boolean(published)}
                          value={method.identifierKind}
                          onChange={(event) =>
                            editMethod(method.id, {
                              identifierKind: event.target
                                .value as RegionalPaymentMethod["identifierKind"],
                              action: "copy",
                            })
                          }
                        >
                          {options.identifierKinds.map((kind) => (
                            <option key={kind} value={kind}>
                              {identifierLabels[kind]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm">
                        Action
                        <select
                          className={`${inputClass} mt-1`}
                          aria-label={`${method.id} action`}
                          disabled={locked || Boolean(published)}
                          value={method.action}
                          onChange={(event) =>
                            editMethod(method.id, {
                              action: event.target.value as "copy" | "upi",
                              ...(event.target.value === "upi"
                                ? { currencies: ["INR"] }
                                : {}),
                            })
                          }
                        >
                          <option value="copy">Copy identifier</option>
                          {method.identifierKind === "upi" ? (
                            <option value="upi">Copy or open UPI</option>
                          ) : null}
                        </select>
                      </label>
                      <label className="text-sm sm:col-span-2">
                        Currencies
                        <select
                          multiple
                          aria-label={`${method.id} currencies`}
                          className={`${inputClass} mt-1 min-h-24`}
                          value={method.currencies}
                          disabled={locked || method.action === "upi"}
                          onChange={(event) =>
                            editMethod(method.id, {
                              currencies: [
                                ...new Set([
                                  ...(published?.currencies ?? []),
                                  ...Array.from(
                                    event.target.selectedOptions,
                                    (option) => option.value,
                                  ),
                                ]),
                              ],
                            })
                          }
                        >
                          {options.currencies.map((entry) => (
                            <option key={entry.code} value={entry.code}>
                              {entry.code} · {entry.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex min-h-11 items-center gap-2 self-end text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-gold"
                          checked={method.enabled}
                          onChange={(event) =>
                            editMethod(method.id, {
                              enabled: event.target.checked,
                            })
                          }
                        />
                        Method enabled
                      </label>
                    </div>
                  </fieldset>
                );
              })}
            </div>
            <fieldset
              disabled={locked}
              className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-5"
            >
              <label className="min-w-40 flex-1 text-sm">
                New method ID
                <input
                  className={`${inputClass} mt-1`}
                  value={newMethodId}
                  maxLength={40}
                  placeholder="paynow"
                  onChange={(event) =>
                    setNewMethodId(event.target.value.toLowerCase())
                  }
                />
              </label>
              <label className="min-w-40 flex-1 text-sm">
                New method name
                <input
                  className={`${inputClass} mt-1`}
                  value={newMethodName}
                  maxLength={60}
                  placeholder="PayNow"
                  onChange={(event) => setNewMethodName(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={commandClass}
                onClick={addMethod}
              >
                <Plus className="h-4 w-4" />
                Add payment method
              </button>
            </fieldset>
          </section>

          {state.history.length ? (
            <section className="mt-10 border-t border-line pt-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <History className="h-5 w-5" />
                Published history
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {state.history.map((entry) => (
                  <li
                    key={entry.revision}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span>
                      Revision {entry.revision}{" "}
                      <span className="ml-2 text-ink-muted">
                        {new Date(entry.publishedAt).toLocaleString("en-GB")}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={commandClass}
                      disabled={locked || dirty}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Replace the saved draft with revision ${entry.revision}? Published settings will not change until you publish.`,
                          )
                        )
                          void mutate("restore", entry.revision);
                      }}
                    >
                      <History className="h-4 w-4" />
                      Restore as draft
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <dialog
            ref={publishDialog}
            aria-labelledby="publish-title"
            aria-modal="true"
            onCancel={(event) => {
              if (busy) event.preventDefault();
              else setConfirmPublish(false);
            }}
            className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-line bg-surface p-6 text-ink shadow-xl backdrop:bg-black/50"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="publish-title" className="font-display text-xl font-bold">
                Publish country catalogue?
              </h2>
              <button
                type="button"
                className={iconClass}
                title="Cancel publishing"
                aria-label="Cancel publishing"
                autoFocus
                onClick={() => setConfirmPublish(false)}
                disabled={busy !== null}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              {draft.countries.length} countries, {draft.paymentMethods.length}{" "}
              payment definitions. Published revision {state.published.revision}{" "}
              will be replaced.
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Enabled:{" "}
              {draft.countries
                .filter((entry) => entry.onboardingEnabled)
                .map((entry) => entry.code)
                .join(", ") || "None"}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={commandClass}
                disabled={busy !== null}
                onClick={() => setConfirmPublish(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${commandClass} border-gold bg-gold text-bg`}
                disabled={busy !== null}
                onClick={() => void mutate("publish")}
              >
                {busy === "publish" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Confirm publish
              </button>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
