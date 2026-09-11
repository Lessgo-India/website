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
