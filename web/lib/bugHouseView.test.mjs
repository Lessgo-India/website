import test from "node:test";
import assert from "node:assert/strict";
import {
  createLatestRequestGate,
  selectBugHouseReloadTarget,
} from "./bugHouseView.js";

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
