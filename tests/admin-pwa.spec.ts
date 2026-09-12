import { expect, test, type Page, type Route } from "@playwright/test";

const now = new Date("2026-09-12T10:00:00.000Z").toISOString();
const bugId = "66aa11bb22cc33dd44ee55ff";
const campaignId = "77aa11bb22cc33dd44ee55ff";

interface AdminMockState {
  unauthorized: boolean;
  expiresAt: number;
  sessionDelayMs: number;
  activeSessions: Array<Record<string, unknown>>;
  passwordConfirmation?: Record<string, unknown>;
}

const mockStates = new WeakMap<Page, AdminMockState>();

async function mockAdminApi(page: Page): Promise<void> {
  const state: AdminMockState = {
    unauthorized: false,
    expiresAt: Date.now() + 28_800_000,
    sessionDelayMs: 0,
    activeSessions: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(Date.now() + 28_800_000).toISOString(),
        browser: "Google Chrome",
        device: "Mac",
        ipAddress: "198.51.100.4",
        current: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(Date.now() + 28_800_000).toISOString(),
        browser: "Safari",
        device: "iPhone",
        ipAddress: "203.0.113.7",
        current: false,
      },
    ],
  };
  mockStates.set(page, state);
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/session") {
      const authorizedAtStart =
        !state.unauthorized && Date.now() < state.expiresAt;
      if (state.sessionDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, state.sessionDelayMs),
        );
      }
      if (!authorizedAtStart) {
        return respond(route, { message: "Your session has expired." }, 401);
      }
      return respond(route, {
        admin: true,
        configured: true,
        userId: "9999999999",
        expiresAt: state.expiresAt,
        statsAvailable: true,
        gatewayReachable: true,
      });
    }
    if (path === "/api/admin/sessions/revoke-others") {
      const revoked = state.activeSessions.filter(
        (session) => !session.current,
      ).length;
      state.activeSessions = state.activeSessions.filter(
        (session) => session.current,
      );
      return respond(route, { revoked });
    }
    if (path === "/api/admin/sessions") {
      if (route.request().method() === "DELETE") {
        const body = route.request().postDataJSON() as { sessionId: string };
        const target = state.activeSessions.find(
          (session) => session.id === body.sessionId,
        );
        state.activeSessions = state.activeSessions.filter(
          (session) => session.id !== body.sessionId,
        );
        return respond(route, {
          revoked: Boolean(target),
          current: target?.current === true,
        });
      }
      return respond(route, { sessions: state.activeSessions });
    }
    if (path === "/api/admin/password/request-otp") {
      return respond(route, {
        challengeId: "33333333-3333-4333-8333-333333333333",
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      });
    }
    if (path === "/api/admin/password/confirm") {
      state.passwordConfirmation = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      return respond(route, { ok: true });
    }
    if (state.unauthorized || Date.now() >= state.expiresAt) {
      return respond(route, { message: "Your session has expired." }, 401);
    }
    if (path.endsWith("/gateway/health")) {
      return respond(route, {
        checkedAt: now,
        summary: { total: 9, ok: 8, degraded: 1, down: 0 },
        services: [
          "gateway",
          "profile",
          "group",
          "events",
          "user",
          "file-upload",
          "status",
          "transactions",
          "notification",
        ].map((name, index) => ({
          name,
          status: index === 8 ? "degraded" : "ok",
          latencyMs: 32 + index * 17,
          httpStatus: 200,
          detail: index === 8 ? "slow response" : null,
        })),
      });
    }
    if (path.endsWith("/gateway/stats")) return respond(route, adminStats());
    if (path.endsWith("/gateway/trends")) return respond(route, trends());
    if (path.endsWith(`/gateway/bugs/${bugId}`)) {
      return respond(route, { ...bugSummary(), logs: "sanitized log line" });
    }
    if (path.endsWith("/gateway/bugs")) {
      return respond(route, {
        items: [bugSummary()],
        page: 1,
        pageSize: 20,
        total: 1,
        hasNextPage: false,
        counts: { all: 1, open: 1, resolved: 0 },
      });
    }
    if (path.endsWith("/gateway/notifications/capabilities")) {
      return respond(route, campaignCapabilities());
    }
    if (path.endsWith("/gateway/notifications/alerts/capabilities")) {
      return respond(route, alertCapabilities());
    }
    if (path.endsWith(`/gateway/notifications/campaigns/${campaignId}`)) {
      return respond(route, campaign(true));
    }
    if (path.endsWith("/gateway/notifications/campaigns")) {
      return respond(route, { items: [campaign(false)], nextCursor: null });
    }
    return respond(route, { message: `Unhandled mock ${path}` }, 404);
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockAdminApi(page);
});

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`operations has no horizontal overflow on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Operations" }),
    ).toBeVisible();
    await expect(page.getByText("Service health")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    if (viewport.name === "desktop") {
      await expect(page.locator("aside").first()).toBeVisible();
      await expect(page.locator(".admin-bottom-nav")).toBeHidden();
    } else {
      await expect(page.locator(".admin-bottom-nav")).toBeVisible();
    }
    await page.screenshot({
      path: testInfo.outputPath(`admin-${viewport.name}.png`),
      fullPage: true,
    });
  });
}

test("every admin route fits a phone viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, heading] of [
    ["/admin", "Operations"],
    ["/admin/bugs", "Bug House"],
    ["/admin/notifications", "Notification Centre"],
    ["/admin/settings", "Settings"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator("header").getByTitle("Sign out")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `${path.replaceAll("/", "-").replace(/^-/, "") || "admin"}-phone.png`,
      ),
      fullPage: true,
    });
  }
});

test("session expiry unmounts previously visible admin data", async ({
  page,
}) => {
  const state = mockStates.get(page)!;
  state.expiresAt = Date.now() + 750;
  await page.goto("/admin/bugs");
  await expect(page.locator(`#bug-${bugId}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lessgo admin" })).toBeVisible(
    {
      timeout: 5_000,
    },
  );
  await expect(page.locator(`#bug-${bugId}`)).toBeHidden();
});

test("an unauthorized reconnect immediately returns to sign-in", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  mockStates.get(page)!.unauthorized = true;
  await page.evaluate(() => window.dispatchEvent(new Event("admin:reconnect")));
  await expect(
    page.getByRole("heading", { name: "Lessgo admin" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeHidden();
});

test("a stale successful session check cannot remount data after invalidation", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  const state = mockStates.get(page)!;
  state.sessionDelayMs = 400;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(50);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("admin:unauthorized")),
  );
  await expect(
    page.getByRole("heading", { name: "Lessgo admin" }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await expect(
    page.getByRole("heading", { name: "Lessgo admin" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeHidden();
});

test("settings changes password with an OTP-derived credential and revokes sessions", async ({
  page,
}) => {
  await page.goto("/admin/settings");
  await expect(
    page.getByRole("heading", { name: "Active sessions" }),
  ).toBeVisible();
  await expect(page.getByText("Safari on iPhone")).toBeVisible();

  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("Verification code").fill("123456");
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-strong-admin-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("a-strong-admin-password");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(
    page.getByText(
      "Password changed. Every other admin session was signed out.",
    ),
  ).toBeVisible();
  const confirmation = mockStates.get(page)!.passwordConfirmation;
  expect(confirmation).toMatchObject({
    challengeId: "33333333-3333-4333-8333-333333333333",
    code: "123456",
  });
  expect(confirmation?.credential).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(confirmation)).not.toContain("a-strong-admin-password");
});

test("manifest, CSP, worker scope, and caches remain admin-safe", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/admin/manifest.webmanifest",
  );
  const manifest = await (
    await request.get("/admin/manifest.webmanifest")
  ).json();
  expect(manifest).toMatchObject({
    id: "/admin",
    scope: "/admin",
    start_url: "/admin",
    display: "standalone",
  });

  const documentResponse = await request.get("/admin");
  const csp = documentResponse.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("worker-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");

  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return "";
        return (await navigator.serviceWorker.ready).scope;
      }),
    )
    .toContain("/admin");

  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const groups = await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        return (await cache.keys()).map((entry) => entry.url);
      }),
    );
    return groups.flat();
  });
  expect(cachedUrls.some((url) => url.endsWith("/admin/offline.html"))).toBe(
    true,
  );
  expect(cachedUrls.some((url) => url.includes("/api/admin"))).toBe(false);
  expect(cachedUrls.some((url) => new URL(url).pathname === "/admin")).toBe(
    false,
  );
});

test("alert destinations focus the requested bug, service, and campaign", async ({
  page,
}) => {
  await page.goto(`/admin/bugs?bug=${bugId}`);
  await expect(page.locator(`#bug-${bugId}`)).toBeFocused();

  await page.goto("/admin?focus=health&service=notification");
  await expect(page.locator("#health-service-notification")).toBeFocused();

  await page.goto(`/admin/notifications?view=history&campaign=${campaignId}`);
  await expect(
    page.getByRole("heading", { name: "Campaign history" }),
  ).toBeVisible();
  await expect(
    page.locator('[aria-labelledby="selected-campaign-heading"]'),
  ).toBeFocused();
});

test("offline mode hides authenticated content and reconnects safely", async ({
  page,
  context,
}) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByRole("heading", { name: "You’re offline" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeHidden();
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
});

function respond(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function bugSummary() {
  return {
    id: bugId,
    title: "Settings screen freezes after retry",
    description: "The save control remains busy after retrying once.",
    screen: "General settings",
    userName: "Reporter",
    userId: "9000000001",
    done: false,
    createdAt: now,
    hasLogs: true,
    logCharacters: 842,
  };
}

function campaignCapabilities() {
  return {
    enabled: true,
    canSend: true,
    audienceConfigured: true,
    firebaseReady: true,
    queue: {
      configured: true,
      reachable: true,
      workers: 1,
      waiting: 0,
      active: 0,
      delayed: 0,
    },
  };
}

function alertCapabilities() {
  return {
    enabled: true,
    configured: true,
    allowed: true,
    activeDevices: 0,
    preferences: {
      enabled: false,
      bugs: false,
      campaigns: false,
      serviceHealth: false,
    },
  };
}

function campaign(withAudit: boolean) {
  return {
    id: campaignId,
    name: "September announcement",
    purpose: "lessgo_update",
    title: "News from Lessgo",
    body: "A new version is available.",
    destination: "home",
    destinationId: null,
    audience: { eventMode: "none" },
    state: "completed",
    scheduledAt: now,
    snapshotAt: now,
    startedAt: now,
    completedAt: now,
    cancellationRequestedAt: null,
    failureReason: null,
    progress: {
      snapshottedUsers: 22,
      processedUsers: 22,
      batchesTotal: 1,
      batchesCompleted: 1,
      acceptedUsers: 13,
      partialUsers: 0,
      failedUsers: 0,
      unknownUsers: 0,
      skippedUsers: 9,
      activeTokens: 13,
      acceptedTokens: 13,
      failedTokens: 0,
      prunedTokens: 0,
    },
    operatorId: "9999999999",
    createdAt: now,
    ...(withAudit
      ? {
          audit: [
            {
              action: "completed",
              actorId: "system",
              details: {},
              createdAt: now,
            },
          ],
        }
      : {}),
  };
}

function trends() {
  return {
    series: Array.from({ length: 30 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      profiles: 1_400 + index * 3,
      users: 6_500 + index * 7,
      events: 3_700 + index * 6,
      groups: 580 + index,
      buzzes: 190 + index,
      expenses: 2_200 + index * 7,
      transactions: 5_700 + index * 12,
      statuses: 2_100 + index * 4,
    })),
  };
}

function adminStats() {
  return {
    generatedAt: now,
    window: { from: now, to: now, days: 7 },
    users: {
      total: 1_482,
      active: 1_370,
      invitedNotJoined: 112,
      inGraph: 6_701,
      created: 82,
      createdPrev: 71,
    },
    events: {
      total: 3_894,
      upcoming: 93,
      live: 7,
      wrapped: 80,
      archived: 3_714,
      recurring: 65,
      created: 104,
      createdPrev: 98,
      byType: [{ type: "HANGOUT", count: 1_300 }],
      rsvp: { going: 8_200, maybe: 900, noReply: 1_300, declined: 420 },
    },
    groups: {
      total: 612,
      withEvents: 430,
      created: 21,
      createdPrev: 18,
      buzzTotal: 220,
      buzzOpen: 12,
      buzzConfirmed: 170,
      buzzExpired: 38,
      buzzCreated: 31,
      buzzCreatedPrev: 27,
    },
    money: {
      expenses: 2_401,
      expenseValue: 2_234_000,
      settlements: 801,
      transactions: 6_100,
      transactionValue: 2_999_000,
      eventsWithExpense: 844,
      created: 72,
      createdValue: 120_400,
      createdPrev: 63,
      transactionsCreated: 150,
      transactionsCreatedPrev: 140,
    },
    vibes: {
      total: 2_210,
      active: 88,
      created: 98,
      createdPrev: 89,
      interest: 942,
    },
    files: {
      documents: 430,
      documentsCreated: 22,
      photos: 3_120,
      photosCreated: 180,
    },
    ratios: {
      guestsPerEvent: 4.3,
      membersPerGroup: 8.8,
      expenseAttachRate: 0.217,
      signupRate: 0.221,
      buzzConversion: 0.817,
      avgExpenseValue: 930.45,
    },
  };
}
