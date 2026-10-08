import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedAdminDelete,
  isAllowedAdminPatch,
  isAllowedAdminPost,
  isAllowedAdminRead,
  isBodylessAdminPost,
  isValidAdminAlertPreferencesBody,
  isValidAdminAlertUnsubscribeBody,
  isValidAdminBugPatchBody,
  isValidAdminPatchBody,
  isValidAdminReportPatchBody,
  isValidAdminPostBody,
} from "./adminGatewayPolicy.js";

const id = "66aa11bb22cc33dd44ee55ff";

test("allows only known admin reads and their documented query parameters", () => {
  assert.equal(isAllowedAdminRead(["health"], new URLSearchParams()), true);
  assert.equal(
    isAllowedAdminRead(
      ["stats"],
      new URLSearchParams({
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-11T00:00:00.000Z",
      }),
    ),
    true,
  );
  assert.equal(
    isAllowedAdminRead(
      ["bugs"],
      new URLSearchParams({ status: "open", page: "1", limit: "20" }),
    ),
    true,
  );
  assert.equal(isAllowedAdminRead(["bugs", id], new URLSearchParams()), true);
  assert.equal(
    isAllowedAdminRead(
      ["reports"],
      new URLSearchParams({
        status: "in_review",
        category: "safety_concern",
        cursor: id,
        limit: "25",
      }),
    ),
    true,
  );
  assert.equal(isAllowedAdminRead(["reports", id], new URLSearchParams()), true);
});

test("allows only documented notification campaign reads", () => {
  assert.equal(
    isAllowedAdminRead(
      ["notifications", "capabilities"],
      new URLSearchParams(),
    ),
    true,
  );
  assert.equal(
    isAllowedAdminRead(
      ["notifications", "events"],
      new URLSearchParams({ query: "Dinner", limit: "30" }),
    ),
    true,
  );
  assert.equal(
    isAllowedAdminRead(
      ["notifications", "campaigns"],
      new URLSearchParams({ purpose: "marketing", limit: "50" }),
    ),
    true,
  );
  assert.equal(
    isAllowedAdminRead(
      ["notifications", "campaigns", id],
      new URLSearchParams(),
    ),
    true,
  );
  assert.equal(
    isAllowedAdminRead(
      ["notifications", "campaigns"],
      new URLSearchParams({ purpose: "internal" }),
    ),
    false,
  );
});

test("allows only exact admin browser-alert contracts", () => {
  const subscription = {
    endpoint: "https://push.example/subscriptions/device-1",
    keys: {
      p256dh: "A".repeat(88),
      auth: "B".repeat(24),
    },
  };
  const preferences = {
    enabled: true,
    bugs: true,
    campaigns: false,
    serviceHealth: true,
  };

  assert.equal(
    isAllowedAdminRead(
      ["notifications", "alerts", "capabilities"],
      new URLSearchParams(),
    ),
    true,
  );
  assert.equal(
    isAllowedAdminPost(["notifications", "alerts", "subscriptions"]),
    true,
  );
  assert.equal(
    isValidAdminPostBody(
      ["notifications", "alerts", "subscriptions"],
      subscription,
    ),
    true,
  );
  assert.equal(
    isValidAdminPostBody(
      ["notifications", "alerts", "subscriptions"],
      { ...subscription, operatorId: "9999999999" },
    ),
    false,
  );
  assert.equal(
    isAllowedAdminPatch(["notifications", "alerts", "preferences"]),
    true,
  );
  assert.equal(isValidAdminAlertPreferencesBody(preferences), true);
  assert.equal(
    isValidAdminAlertPreferencesBody({ ...preferences, admin: true }),
    false,
  );
  assert.equal(
    isAllowedAdminDelete(["notifications", "alerts", "subscriptions"]),
    true,
  );
  assert.equal(
    isValidAdminAlertUnsubscribeBody({ endpoint: subscription.endpoint }),
    true,
  );
  assert.equal(
    isValidAdminAlertUnsubscribeBody({ endpoint: "http://push.example" }),
    false,
  );
});

test("validates exact campaign mutation contracts", () => {
  const preview = {
    purpose: "lessgo_update",
    audience: {
      eventMode: "recent",
      lookbackDays: 30,
      genders: ["F"],
      roles: [0, 1],
      rsvpStatuses: [1],
    },
  };
  assert.equal(isAllowedAdminPost(["notifications", "previews"]), true);
  assert.equal(
    isValidAdminPostBody(["notifications", "previews"], preview),
    true,
  );
  assert.equal(
    isValidAdminPostBody(["notifications", "previews"], {
      ...preview,
      userIds: ["9999999999"],
    }),
    false,
  );
  assert.equal(
    isValidAdminPostBody(["notifications", "test"], {
      previewId: id,
      purpose: "marketing",
      title: "Offer",
      body: "Available now",
      destination: "event",
      destinationId: id,
    }),
    true,
  );
  assert.equal(
    isValidAdminPostBody(["notifications", "test"], {
      previewId: id,
      purpose: "marketing",
      title: "Offer",
      body: "Available now",
      destination: "https://example.com",
    }),
    false,
  );
  assert.equal(
    isAllowedAdminPost(["notifications", "campaigns", id, "cancel"]),
    true,
  );
  assert.equal(
    isAllowedAdminPost(["notifications", "campaigns", id, "delete"]),
    false,
  );
});

test("rejects future endpoints, unknown parameters, duplicate parameters, and malformed ids", () => {
  assert.equal(isAllowedAdminRead(["users"], new URLSearchParams()), false);
  assert.equal(
    isAllowedAdminRead(["health"], new URLSearchParams({ debug: "1" })),
    false,
  );
  assert.equal(
    isAllowedAdminRead(["bugs"], new URLSearchParams("page=1&page=2")),
    false,
  );
  assert.equal(
    isAllowedAdminRead(["bugs"], new URLSearchParams({ limit: "99" })),
    false,
  );
  assert.equal(
    isAllowedAdminRead(["stats"], new URLSearchParams({ from: "not-a-date" })),
    false,
  );
  assert.equal(
    isAllowedAdminRead(["bugs", "not-an-id"], new URLSearchParams()),
    false,
  );
});

test("allows only the two documented Bug House mutation shapes", () => {
  assert.equal(isAllowedAdminPatch(["bugs", id]), true);
  assert.equal(isAllowedAdminPatch(["stats", id]), false);
  assert.equal(isAllowedAdminDelete(["bugs", "done"]), true);
  assert.equal(isAllowedAdminDelete(["bugs", id]), false);
  assert.equal(isValidAdminBugPatchBody({ done: true }), true);
  assert.equal(isValidAdminBugPatchBody({ done: "yes" }), false);
  assert.equal(isValidAdminBugPatchBody({ done: true, role: "admin" }), false);
});

test("allows only exact user report review mutations", () => {
  assert.equal(isAllowedAdminPatch(["reports", id]), true);
  assert.equal(isAllowedAdminPatch(["reports", "not-an-id"]), false);
  assert.equal(
    isValidAdminReportPatchBody({
      status: "in_review",
      note: "Reviewing context",
      revision: 0,
    }),
    true,
  );
  assert.equal(
    isValidAdminReportPatchBody({ note: "Internal note", revision: 2 }),
    true,
  );
  assert.equal(
    isValidAdminReportPatchBody({
      status: "banned",
      note: "No",
      revision: 0,
    }),
    false,
  );
  assert.equal(
    isValidAdminReportPatchBody({
      status: "resolved",
      note: "Reviewed",
      revision: 0,
      role: "owner",
    }),
    false,
  );
});

// ── Admin → Partners (web/lib/adminPartnersApi.ts) ──────────────────────────

const partnerId = "ptr_brew_bros";
const onboarding = {
  brandName: "Brew Bros Café",
  legalName: "Brew Brothers Hospitality Pvt Ltd",
  category: "Cafés",
  channels: ["in_store"],
  website: "",
  bookingProducts: [],
  bookingMethod: "lessgo_connect",
  gstin: "29AABCB4821K1Z5",
  city: "Bengaluru",
  stateCode: "KA",
  logoEmoji: "☕",
  brandColor: "#8D5524",
  plan: "standard",
  contactName: "Rohan Mehta",
  contactEmail: "partnerships@brewbros.example",
  contactPhone: "9876500001",
  handle: "brewbros",
  owner: {
    name: "Rohan Mehta",
    email: "partnerships@brewbros.example",
    phone: "9876500001",
  },
  dispatch: { email: true },
};

test("allows exactly the partner reads the admin console makes", () => {
  const none = new URLSearchParams();
  assert.equal(isAllowedAdminRead(["partners"], none), true);
  assert.equal(isAllowedAdminRead(["partners", partnerId], none), true);
  assert.equal(isAllowedAdminRead(["partners", "ptr_stylecart"], none), true);
  assert.equal(isAllowedAdminRead(["partner-handles", "brewbros"], none), true);

  assert.equal(
    isAllowedAdminRead(["partners"], new URLSearchParams({ status: "active" })),
    false,
  );
  assert.equal(isAllowedAdminRead(["partners", "brew_bros"], none), false);
  assert.equal(isAllowedAdminRead(["partners", "ptr_Brew"], none), false);
  assert.equal(isAllowedAdminRead(["partners", partnerId, "logins"], none), false);
  assert.equal(isAllowedAdminRead(["partner-handles", "Brew-Bros"], none), false);
  assert.equal(isAllowedAdminRead(["partner-handles", "ab"], none), false);
  assert.equal(isAllowedAdminRead(["campaigns", "cmp_1"], none), false);
});

test("allows exactly the partner POSTs, and only approve is bodiless", () => {
  const allowed = [
    ["partners"],
    ["partners", partnerId, "logins"],
    ["partners", partnerId, "logins", "brewbros.owner", "reset-password"],
    ["partners", partnerId, "logins", "brewbros.hsrlayout2", "reset-password"],
    ["partners", partnerId, "integrations", "online_code", "approve"],
    ["partners", partnerId, "integrations", "api_booking", "rollback"],
    ["campaigns", "cmp_brew_bros_blr", "review"],
    ["campaigns", "cmp_lz3k9q1x8f2a", "review"],
  ];
  for (const segments of allowed) {
    assert.equal(isAllowedAdminPost(segments), true, segments.join("/"));
  }
  assert.deepEqual(
    allowed.filter((segments) => isBodylessAdminPost(segments)),
    [["partners", partnerId, "integrations", "online_code", "approve"]],
  );

  for (const segments of [
    ["partners", partnerId],
    ["partners", "brewbros", "logins"],
    ["partners", partnerId, "logins", "brewbros", "reset-password"],
    ["partners", partnerId, "logins", "brewbros.owner", "delete"],
    ["partners", partnerId, "integrations", "in_store", "approve"],
    ["partners", partnerId, "integrations", "online_code", "delete"],
    ["partners", partnerId, "integrations", "online_code"],
    ["campaigns", "66aa11bb22cc33dd44ee55ff", "review"],
    ["campaigns", "cmp_1", "approve"],
    ["campaigns", "cmp_1"],
  ]) {
    assert.equal(isAllowedAdminPost(segments), false, segments.join("/"));
  }
  // The notification actions keep their bodiless contract.
  assert.equal(isBodylessAdminPost(["notifications", "campaigns", id, "cancel"]), true);
  assert.equal(isBodylessAdminPost(["notifications", "alerts", "test"]), true);
  assert.equal(isBodylessAdminPost(["notifications", "campaigns"]), false);
});

test("validates partner POST bodies by shape, leaving business rules to the offers service", () => {
  assert.equal(isValidAdminPostBody(["partners"], onboarding), true);
  assert.equal(
    isValidAdminPostBody(["partners"], {
      ...onboarding,
      channels: ["online_code", "api_booking"],
      website: "https://showspot.example",
      bookingProducts: ["movie_tickets", "event_tickets"],
      bookingMethod: "adapter",
      plan: "enterprise",
    }),
    true,
  );
  // An empty channel list is a 422 from the service, not a BFF rejection.
  assert.equal(isValidAdminPostBody(["partners"], { ...onboarding, channels: [] }), true);
  for (const broken of [
    { ...onboarding, status: "active" },
    { ...onboarding, channels: ["in_store", "in_store"] },
    { ...onboarding, channels: ["teleport"] },
    { ...onboarding, bookingMethod: "fax" },
    { ...onboarding, plan: "free" },
    { ...onboarding, brandName: 42 },
    { ...onboarding, legalName: "x".repeat(201) },
    { ...onboarding, owner: { ...onboarding.owner, role: "admin" } },
    { ...onboarding, dispatch: { email: "yes" } },
    // SMS was removed: the old { email, sms } shape no longer passes.
    { ...onboarding, dispatch: { email: true, sms: false } },
    Object.fromEntries(Object.entries(onboarding).filter(([key]) => key !== "handle")),
  ]) {
    assert.equal(isValidAdminPostBody(["partners"], broken), false);
  }

  const logins = ["partners", partnerId, "logins"];
  const cashier = {
    name: "Asha",
    email: "asha@brewbros.example",
    phone: "9876500101",
    role: "cashier",
    outletId: "out_brew_hsr",
    dispatch: { email: true },
  };
  assert.equal(isValidAdminPostBody(logins, cashier), true);
  assert.equal(
    isValidAdminPostBody(logins, {
      name: "Ira",
      email: "ira@brewbros.example",
      role: "manager",
      dispatch: { email: false },
    }),
    true,
  );
  assert.equal(isValidAdminPostBody(logins, { ...cashier, role: "admin" }), false);
  assert.equal(isValidAdminPostBody(logins, { ...cashier, outletId: "../x" }), false);
  assert.equal(isValidAdminPostBody(logins, { ...cashier, password: "hunter2" }), false);

  const reset = ["partners", partnerId, "logins", "brewbros.owner", "reset-password"];
  assert.equal(isValidAdminPostBody(reset, { dispatch: { email: true } }), true);
  assert.equal(isValidAdminPostBody(reset, { dispatch: { email: true, sms: true } }), false);
  assert.equal(
    isValidAdminPostBody(reset, { dispatch: { email: true }, to: "x@evil.example" }),
    false,
  );

  const rollback = ["partners", partnerId, "integrations", "online_code", "rollback"];
  assert.equal(isValidAdminPostBody(rollback, { reason: "Checkout errors" }), true);
  assert.equal(isValidAdminPostBody(rollback, { reason: "" }), true);
  assert.equal(isValidAdminPostBody(rollback, { reason: 5 }), false);
  assert.equal(isValidAdminPostBody(rollback, {}), false);
  assert.equal(
    isValidAdminPostBody(["partners", partnerId, "integrations", "online_code", "approve"], {}),
    false,
  );

  const review = ["campaigns", "cmp_brew_bros_blr", "review"];
  assert.equal(isValidAdminPostBody(review, { decision: "approve" }), true);
  assert.equal(isValidAdminPostBody(review, { decision: "reject", note: "Fix the dates please." }), true);
  assert.equal(isValidAdminPostBody(review, { decision: "approve", note: "x" }), false);
  assert.equal(isValidAdminPostBody(review, { decision: "reject" }), false);
  assert.equal(isValidAdminPostBody(review, { decision: "publish" }), false);
});

test("allows exactly the partner PATCHes with their bodies", () => {
  const status = ["partners", partnerId];
  const channels = ["partners", partnerId, "channels"];
  const login = ["partners", partnerId, "logins", "brewbros.manager"];
  for (const segments of [status, channels, login]) {
    assert.equal(isAllowedAdminPatch(segments), true, segments.join("/"));
  }
  for (const segments of [
    ["partners"],
    ["partners", "66aa11bb22cc33dd44ee55ff"],
    ["partners", partnerId, "integration"],
    ["partners", partnerId, "logins", "brewbros"],
    ["partners", partnerId, "logins", "brewbros.owner", "status"],
  ]) {
    assert.equal(isAllowedAdminPatch(segments), false, segments.join("/"));
  }

  assert.equal(isValidAdminPatchBody(status, { status: "suspended", reason: "Unpaid invoices" }), true);
  assert.equal(isValidAdminPatchBody(status, { status: "active" }), true);
  assert.equal(isValidAdminPatchBody(status, { status: "active", reason: "x" }), false);
  assert.equal(isValidAdminPatchBody(status, { status: "invited" }), false);
  assert.equal(isValidAdminPatchBody(status, { status: "suspended" }), false);

  assert.equal(isValidAdminPatchBody(channels, { channels: ["in_store"] }), true);
  assert.equal(
    isValidAdminPatchBody(channels, {
      channels: ["in_store", "api_booking"],
      website: "https://reelhouse.example",
      bookingProducts: ["movie_tickets"],
      bookingMethod: "lessgo_connect",
    }),
    true,
  );
  assert.equal(isValidAdminPatchBody(channels, { channels: ["in_store"], allowedDomains: ["x"] }), false);
  assert.equal(isValidAdminPatchBody(channels, { channels: "in_store" }), false);
  assert.equal(isValidAdminPatchBody(channels, { website: "https://x.example" }), false);

  assert.equal(isValidAdminPatchBody(login, { status: "disabled" }), true);
  assert.equal(isValidAdminPatchBody(login, { status: "active" }), true);
  assert.equal(isValidAdminPatchBody(login, { status: "deleted" }), false);
  assert.equal(isValidAdminPatchBody(login, { status: "active", role: "owner" }), false);

  // Existing PATCH contracts route through the same check.
  assert.equal(isValidAdminPatchBody(["bugs", id], { done: true }), true);
  assert.equal(isValidAdminPatchBody(["reports", id], { note: "Seen", revision: 1 }), true);
  assert.equal(
    isValidAdminPatchBody(["notifications", "alerts", "preferences"], {
      enabled: true,
      bugs: true,
      campaigns: false,
      serviceHealth: true,
    }),
    true,
  );
  assert.equal(isValidAdminPatchBody(["stats"], { done: true }), false);
  // Partner endpoints never gain DELETE.
  assert.equal(isAllowedAdminDelete(["partners", partnerId]), false);
});
