import test from "node:test";
import assert from "node:assert/strict";
import {
  createLatestRequestGate,
  formatBugDetailsForClipboard,
  selectBugHouseReloadTarget,
} from "./bugHouseView.js";

test("formats copyable bug details without logs", () => {
  const copied = formatBugDetailsForClipboard(
    {
      id: "66aa11bb22cc33dd44ee55ff",
      title: "Settings screen freezes after retry",
      description: "The save control remains busy after retrying once.",
      screen: "General settings",
      userName: "Reporter",
      userId: "9000000001",
      done: false,
      logs: "sanitized log line",
    },
    "12 Sep 2026, 3:30 pm",
  );

  assert.equal(
    copied,
    [
      "Bug details",
      "Title: Settings screen freezes after retry",
      "Status: Open",
      "Filed: 12 Sep 2026, 3:30 pm",
      "Screen: General settings",
      "Reporter: Reporter",
      "User ID: 9000000001",
      "Bug ID: 66aa11bb22cc33dd44ee55ff",
      "",
      "Description:",
      "The save control remains busy after retrying once.",
    ].join("\n"),
  );
  assert.doesNotMatch(copied, /sanitized log line|logs?:/i);
});

test("reloads the latest selected view after a deferred mutation", () => {
  const original = { filter: "open", page: 3 };
  const latest = { filter: "resolved", page: 1 };

  assert.notDeepEqual(
    selectBugHouseReloadTarget(latest.filter, latest.page),
    original,
  );
  assert.deepEqual(
    selectBugHouseReloadTarget(latest.filter, latest.page),
    latest,
  );
});

test("steps back one page only when the current page becomes empty", () => {
  assert.deepEqual(selectBugHouseReloadTarget("open", 3, true), {
    filter: "open",
    page: 2,
  });
  assert.deepEqual(selectBugHouseReloadTarget("open", 1, true), {
    filter: "open",
    page: 1,
  });
});

test("an invalidated deferred request cannot commit after a filter change", async () => {
  const gate = createLatestRequestGate();
  const committed = [];
  let resolveOld;
  const oldResponse = new Promise((resolve) => {
    resolveOld = resolve;
  });
  const oldRequest = gate.begin();
  const oldCommit = oldResponse.then((value) => {
    if (gate.isCurrent(oldRequest)) committed.push(value);
  });

  gate.invalidate();
  const newRequest = gate.begin();
  if (gate.isCurrent(newRequest)) committed.push("resolved-results");

  resolveOld("open-results");
  await oldCommit;

  assert.deepEqual(committed, ["resolved-results"]);
});
