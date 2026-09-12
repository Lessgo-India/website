import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createAdminGatewayHandlers } from "./adminGatewayRoute.ts";

const calls = [];
let session = { sub: "9999999999", iat: 1, exp: 4_000_000_000 };

const route = createAdminGatewayHandlers({
  readSession: () => session,
  callGateway: async (...args) => {
    calls.push(args);
    return { status: 200, body: { ok: true } };
  },
});

function context(...path) {
  return { params: Promise.resolve({ path }) };
}

beforeEach(() => {
  calls.length = 0;
  session = { sub: "9999999999", iat: 1, exp: 4_000_000_000 };
});

test("rejects requests without an admin session", async () => {
  session = null;
  const response = await route.GET(
    new Request("http://local/api/admin/gateway/bugs"),
    context("bugs"),
  );

  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("forwards only documented paginated list and lazy detail reads", async () => {
  const list = await route.GET(
    new Request(
      "http://local/api/admin/gateway/bugs?status=open&page=1&limit=20",
    ),
    context("bugs"),
  );
  assert.equal(list.status, 200);
  assert.deepEqual(calls[0].slice(0, 2), [
    "bugs",
    "?status=open&page=1&limit=20",
  ]);

  const id = "66aa11bb22cc33dd44ee55ff";
  const detail = await route.GET(
    new Request(`http://local/api/admin/gateway/bugs/${id}`),
    context("bugs", id),
  );
  assert.equal(detail.status, 200);
  assert.equal(calls[1][0], `bugs/${id}`);

  const denied = await route.GET(
    new Request("http://local/api/admin/gateway/users"),
    context("users"),
  );
  assert.equal(denied.status, 404);
  assert.equal(calls.length, 2);
});

test("rejects broad mutation bodies and forwards exact Bug House writes", async () => {
  const id = "66aa11bb22cc33dd44ee55ff";
  const broad = await route.PATCH(
    new Request(`http://local/api/admin/gateway/bugs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done: true, role: "admin" }),
    }),
    context("bugs", id),
  );
  assert.equal(broad.status, 400);

  const queried = await route.PATCH(
    new Request(`http://local/api/admin/gateway/bugs/${id}?role=admin`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done: true }),
    }),
    context("bugs", id),
  );
  assert.equal(queried.status, 404);

  const exact = await route.PATCH(
    new Request(`http://local/api/admin/gateway/bugs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ done: true }),
    }),
    context("bugs", id),
  );
  assert.equal(exact.status, 200);
  assert.deepEqual(calls[0][3], { method: "PATCH", body: { done: true } });

  const cleanup = await route.DELETE(
    new Request("http://local/api/admin/gateway/bugs/done", {
      method: "DELETE",
    }),
    context("bugs", "done"),
  );
  assert.equal(cleanup.status, 200);
  assert.deepEqual(calls[1][3], { method: "DELETE" });

  const queriedCleanup = await route.DELETE(
    new Request("http://local/api/admin/gateway/bugs/done?force=true", {
      method: "DELETE",
    }),
    context("bugs", "done"),
  );
  assert.equal(queriedCleanup.status, 404);
});

test("forwards only same-origin, JSON campaign mutations", async () => {
  const body = {
    purpose: "lessgo_update",
    audience: { eventMode: "none" },
  };
  const accepted = await route.POST(
    new Request("http://local/api/admin/gateway/notifications/previews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://local",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify(body),
    }),
    context("notifications", "previews"),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(calls[0][3], { method: "POST", body });

  const proxied = await route.POST(
    new Request(
      "http://internal-service:3000/api/admin/gateway/notifications/previews",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://www.lessgo.in",
          "sec-fetch-site": "same-origin",
          "x-forwarded-host": "www.lessgo.in",
          "x-forwarded-proto": "https",
        },
        body: JSON.stringify(body),
      },
    ),
    context("notifications", "previews"),
  );
  assert.equal(proxied.status, 200);
  assert.deepEqual(calls[1][3], { method: "POST", body });

  const crossOrigin = await route.POST(
    new Request("http://local/api/admin/gateway/notifications/previews", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify(body),
    }),
    context("notifications", "previews"),
  );
  assert.equal(crossOrigin.status, 403);

  const broad = await route.POST(
    new Request("http://local/api/admin/gateway/notifications/previews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, userIds: ["9999999999"] }),
    }),
    context("notifications", "previews"),
  );
  assert.equal(broad.status, 400);
  assert.equal(calls.length, 2);
});

test("allows only empty-body campaign actions", async () => {
  const id = "66aa11bb22cc33dd44ee55ff";
  const accepted = await route.POST(
    new Request(
      `http://local/api/admin/gateway/notifications/campaigns/${id}/cancel`,
      { method: "POST" },
    ),
    context("notifications", "campaigns", id, "cancel"),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(calls[0][3], { method: "POST" });

  const rejected = await route.POST(
    new Request(
      `http://local/api/admin/gateway/notifications/campaigns/${id}/cancel`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force: true }),
      },
    ),
    context("notifications", "campaigns", id, "cancel"),
  );
  assert.equal(rejected.status, 400);
  assert.equal(calls.length, 1);
});

test("forwards exact same-origin browser-alert mutations", async () => {
  const headers = {
    "content-type": "application/json",
    origin: "http://local",
    "sec-fetch-site": "same-origin",
  };
  const subscription = {
    endpoint: "https://push.example/subscriptions/device-1",
    keys: { p256dh: "A".repeat(88), auth: "B".repeat(24) },
  };
  const preferences = {
    enabled: true,
    bugs: true,
    campaigns: true,
    serviceHealth: true,
  };

  const subscribed = await route.POST(
    new Request(
      "http://local/api/admin/gateway/notifications/alerts/subscriptions",
      { method: "POST", headers, body: JSON.stringify(subscription) },
    ),
    context("notifications", "alerts", "subscriptions"),
  );
  const updated = await route.PATCH(
    new Request(
      "http://local/api/admin/gateway/notifications/alerts/preferences",
      { method: "PATCH", headers, body: JSON.stringify(preferences) },
    ),
    context("notifications", "alerts", "preferences"),
  );
  const removed = await route.DELETE(
    new Request(
      "http://local/api/admin/gateway/notifications/alerts/subscriptions",
      {
        method: "DELETE",
        headers,
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      },
    ),
    context("notifications", "alerts", "subscriptions"),
  );
  const tested = await route.POST(
    new Request("http://local/api/admin/gateway/notifications/alerts/test", {
      method: "POST",
      headers: {
        origin: "http://local",
        "sec-fetch-site": "same-origin",
      },
    }),
    context("notifications", "alerts", "test"),
  );

  assert.equal(subscribed.status, 200);
  assert.equal(updated.status, 200);
  assert.equal(removed.status, 200);
  assert.equal(tested.status, 200);
  assert.deepEqual(calls.map((call) => call[0]), [
    "notifications/alerts/subscriptions",
    "notifications/alerts/preferences",
    "notifications/alerts/subscriptions",
    "notifications/alerts/test",
  ]);
  assert.deepEqual(calls[1][3], { method: "PATCH", body: preferences });
  assert.deepEqual(calls[2][3], {
    method: "DELETE",
    body: { endpoint: subscription.endpoint },
  });
});

test("rejects cross-origin PATCH and DELETE mutations", async () => {
  const attackHeaders = {
    "content-type": "application/json",
    origin: "https://attacker.example",
    "sec-fetch-site": "cross-site",
  };
  const patched = await route.PATCH(
    new Request(
      "http://local/api/admin/gateway/notifications/alerts/preferences",
      {
        method: "PATCH",
        headers: attackHeaders,
        body: JSON.stringify({
          enabled: true,
          bugs: true,
          campaigns: true,
          serviceHealth: true,
        }),
      },
    ),
    context("notifications", "alerts", "preferences"),
  );
  const deleted = await route.DELETE(
    new Request("http://local/api/admin/gateway/bugs/done", {
      method: "DELETE",
      headers: attackHeaders,
    }),
    context("bugs", "done"),
  );

  assert.equal(patched.status, 403);
  assert.equal(deleted.status, 403);
  assert.equal(calls.length, 0);
});
