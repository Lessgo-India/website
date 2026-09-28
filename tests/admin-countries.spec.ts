import { expect, test, type Page } from "@playwright/test";
import type {
  RegionalAdminState,
  RegionalDraft,
  RegionalOptions,
} from "../web/lib/regionalConfigApi";

const options: RegionalOptions = {
  countries: [
    { code: "IN", name: "India", callingCode: "+91" },
    { code: "SG", name: "Singapore", callingCode: "+65" },
    { code: "JP", name: "Japan", callingCode: "+81" },
  ],
  currencies: [
    { code: "INR", name: "Indian Rupee", minorUnits: 2 },
    { code: "SGD", name: "Singapore Dollar", minorUnits: 2 },
    { code: "JPY", name: "Yen", minorUnits: 0 },
  ],
  identifierKinds: ["upi", "handle", "email", "phone", "email_or_phone"],
  actions: ["copy", "upi"],
};

async function mockRegions(
  page: Page,
  canEdit = true,
  internationalReady = false,
) {
  const initial: RegionalDraft = {
    countries: [
      {
        code: "IN",
        defaultLocale: "en-IN",
        defaultCurrency: "INR",
        paymentMethodIds: ["upi"],
        onboardingEnabled: true,
      },
    ],
    paymentMethods: [
      {
        id: "upi",
        name: "UPI",
        label: "UPI ID",
        placeholder: "yourname@bank",
        identifierKind: "upi",
        action: "upi",
        currencies: ["INR"],
        enabled: true,
      },
    ],
  };
  const state: RegionalAdminState = {
    revision: 0,
    canEdit,
    published: {
      ...initial,
      countries: initial.countries.map((country) => ({
        ...country,
        name: "India",
        callingCode: "+91",
      })),
      schemaVersion: 1,
      revision: 0,
      publishedAt: "2026-09-28T00:00:00Z",
      currencies: [{ code: "INR", minorUnits: 2 }],
    },
    draft: null,
    audit: [],
    history: [],
    activationPolicy: {
      internationalReady,
      activeCountryCodes: internationalReady ? [] : ["IN"],
      activeCurrencies: internationalReady ? [] : ["INR"],
      reason: "Migration pending",
    },
  };
  const failures = { load: false, conflict: false, expired: false };
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/admin/session") {
      return respond({
        admin: true,
        configured: true,
        userId: "test-operator",
        expiresAt: Date.now() + 3_600_000,
        statsAvailable: true,
        gatewayReachable: true,
      });
    }
    if (path.includes("regions")) {
      if (failures.expired)
        return respond({ message: "Your session has expired." }, 401);
      if (failures.load)
        return respond(
          { message: "Regional configuration is temporarily unavailable." },
          503,
        );
      if (path.endsWith("/options")) return respond(options);
      if (path.endsWith("/regions")) return respond(state);
      if (!canEdit) return respond({ message: "Read-only access." }, 403);
      if (failures.conflict)
        return respond(
          {
            message:
              "The catalogue changed. Reload it before saving or publishing.",
          },
          409,
        );
      const body = route.request().postDataJSON();
      expect(body.expectedRevision).toBe(state.revision);
      if (path.endsWith("/draft")) {
        state.draft = body.catalogue;
        state.revision += 1;
        return respond(state);
      }
      if (path.endsWith("/publish")) {
        expect(state.draft).not.toBeNull();
        state.history.unshift({
          revision: state.published.revision,
          publishedAt: state.published.publishedAt,
        });
        state.revision += 1;
        state.published = {
          ...state.draft!,
          schemaVersion: 1,
          revision: state.revision,
          publishedAt: new Date().toISOString(),
          countries: state.draft!.countries.map((country) => ({
            ...country,
            name: options.countries.find(
              (entry) => entry.code === country.code,
            )!.name,
            callingCode: options.countries.find(
              (entry) => entry.code === country.code,
            )!.callingCode,
          })),
          currencies: options.currencies
            .filter((entry) =>
              state.draft!.countries.some(
                (country) => country.defaultCurrency === entry.code,
              ),
            )
            .map(({ code, minorUnits }) => ({ code, minorUnits })),
        };
        state.draft = null;
        return respond(state);
      }
      if (path.endsWith("/restore")) {
        state.revision += 1;
        state.draft = {
          ...initial,
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
        };
        return respond(state);
      }
    }
    if (path.endsWith("/notifications/alerts/capabilities"))
      return respond({ available: false, preferences: { enabled: false } });
    return respond({ message: "Not found" }, 404);
  });
  return { state, failures };
}

for (const viewport of [
  { width: 1440, height: 960 },
  { width: 390, height: 844 },
]) {
  test(`country editor saves, previews and publishes at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const { state } = await mockRegions(page);
    await page.goto("/admin/countries");
    await expect(
      page.getByRole("heading", { name: "Countries", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Add country" })
      .selectOption("SG");
    await page
      .getByRole("button", { name: "Add country", exact: true })
      .click();
    await page
      .getByLabel("Default currency", { exact: true })
      .selectOption("SGD");
    await expect(page.getByLabel("Onboarding enabled")).toBeDisabled();
    await page.getByLabel("New method ID").fill("paynow");
    await page.getByLabel("New method name").fill("PayNow");
    await page.getByRole("button", { name: "Add payment method" }).click();
    await page.getByLabel("paynow identifier type").selectOption("phone");
    await page.getByRole("checkbox", { name: "PayNow", exact: true }).check();
    await expect(page.getByLabel("Country preview")).toContainText("SGD");
    await expect(page.getByLabel("Preview PayNow ID")).toBeVisible();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Draft saved.");
    expect(
      state.draft?.countries.find((country) => country.code === "SG")
        ?.onboardingEnabled,
    ).toBe(false);
    expect(
      state.draft?.paymentMethods.find((method) => method.id === "paynow"),
    ).toMatchObject({
      identifierKind: "phone",
      action: "copy",
      currencies: ["SGD"],
    });
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.getByRole("button", { name: "Confirm publish" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Country catalogue published.",
    );
    expect(state.published.countries).toHaveLength(2);
    await page.reload();
    await expect(
      page.getByRole("navigation", { name: "Configured countries" }),
    ).toContainText("Singapore");
    await expect(
      page.getByRole("button", { name: "Publish", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`countries-${viewport.width}.png`),
      fullPage: true,
    });
  });
}

test("read-only operators cannot edit or publish countries", async ({
  page,
}) => {
  await mockRegions(page, false);
  await page.goto("/admin/countries");
  await expect(
    page.getByText("Read-only access", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Formatting locale", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add country", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
});

test("international activation allows configured country toggles", async ({
  page,
}) => {
  await mockRegions(page, true, true);
  await page.goto("/admin/countries");
  await page.getByRole("combobox", { name: "Add country" }).selectOption("SG");
  await page.getByRole("button", { name: "Add country", exact: true }).click();
  await page
    .getByLabel("Default currency", { exact: true })
    .selectOption("SGD");
  await expect(page.getByLabel("Onboarding enabled")).toBeEnabled();
  await page.getByLabel("Onboarding enabled").check();
  await expect(page.getByLabel("Onboarding enabled")).toBeChecked();
});

test("retains edits on a conflicting save and recovers from unavailable configuration", async ({
  page,
}) => {
  const { failures } = await mockRegions(page);
  failures.load = true;
  await page.goto("/admin/countries");
  await expect(
    page.getByRole("alert").filter({ hasText: "temporarily unavailable" }),
  ).toBeVisible();
  failures.load = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByLabel("Formatting locale", { exact: true }).fill("en-GB");
  failures.conflict = true;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "catalogue changed" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Formatting locale", { exact: true }),
  ).toHaveValue("en-GB");
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  failures.conflict = false;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Draft saved.");
});
