import { adminRequest } from "./adminApi";

export type PaymentIdentifierKind =
  | "upi"
  | "handle"
  | "email"
  | "phone"
  | "email_or_phone";

export interface RegionalPaymentMethod {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  identifierKind: PaymentIdentifierKind;
  action: "copy" | "upi";
  currencies: string[];
  enabled: boolean;
}

export interface RegionalCountry {
  code: string;
  defaultLocale: string;
  defaultCurrency: string;
  paymentMethodIds: string[];
  onboardingEnabled: boolean;
}

export interface RegionalDraft {
  countries: RegionalCountry[];
  paymentMethods: RegionalPaymentMethod[];
}

export interface PublishedRegions extends RegionalDraft {
  schemaVersion: number;
  revision: number;
  publishedAt: string;
  countries: Array<RegionalCountry & { name: string; callingCode: string }>;
  currencies: Array<{ code: string; minorUnits: number }>;
}

export interface RegionalAdminState {
  revision: number;
  published: PublishedRegions;
  draft: RegionalDraft | null;
  canEdit?: boolean;
  history: Array<{ revision: number; publishedAt: string }>;
  audit: Array<{
    action: string;
    actorRef: string;
    revision: number;
    at: string;
  }>;
  activationPolicy: {
    internationalReady: boolean;
    activeCountryCodes: string[];
    activeCurrencies: string[];
    reason: string;
  };
}

export interface RegionalOptions {
  countries: Array<{ code: string; name: string; callingCode: string }>;
  currencies: Array<{ code: string; name: string; minorUnits: number }>;
  identifierKinds: PaymentIdentifierKind[];
  actions: Array<"copy" | "upi">;
}

export function editableCatalogue(state: RegionalAdminState): RegionalDraft {
  return structuredClone(
    state.draft ?? {
      countries: state.published.countries.map(
        ({
          code,
          defaultLocale,
          defaultCurrency,
          paymentMethodIds,
          onboardingEnabled,
        }) => ({
          code,
          defaultLocale,
          defaultCurrency,
          paymentMethodIds,
          onboardingEnabled,
        }),
      ),
      paymentMethods: state.published.paymentMethods,
    },
  );
}

export const getRegionalState = () =>
  adminRequest<RegionalAdminState>("/gateway/regions");
export const getRegionalOptions = () =>
  adminRequest<RegionalOptions>("/gateway/regions/options");

export const saveRegionalDraft = (
  catalogue: RegionalDraft,
  expectedRevision: number,
) =>
  adminRequest<RegionalAdminState>("/gateway/regions/draft", {
    method: "POST",
    body: { catalogue, expectedRevision },
  });

export const publishRegionalDraft = (expectedRevision: number) =>
  adminRequest<RegionalAdminState>("/gateway/regions/publish", {
    method: "POST",
    body: { expectedRevision },
  });

export const restoreRegionalDraft = (
  sourceRevision: number,
  expectedRevision: number,
) =>
  adminRequest<RegionalAdminState>("/gateway/regions/restore", {
    method: "POST",
    body: { sourceRevision, expectedRevision },
  });
