import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedAdminDelete,
  isAllowedAdminPatch,
  isAllowedAdminRead,
  isValidAdminBugPatchBody,
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
