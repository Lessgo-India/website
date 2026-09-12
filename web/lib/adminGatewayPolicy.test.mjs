import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedAdminDelete,
  isAllowedAdminPatch,
  isAllowedAdminPost,
  isAllowedAdminRead,
  isValidAdminAlertPreferencesBody,
  isValidAdminAlertUnsubscribeBody,
  isValidAdminBugPatchBody,
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
