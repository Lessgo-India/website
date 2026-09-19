export function selectBugHouseReloadTarget(
  filter,
  page,
  pageBecameEmpty = false,
) {
  return {
    filter,
    page: pageBecameEmpty && page > 1 ? page - 1 : page,
  };
}

export function formatBugDetailsForClipboard(bug, filedAt) {
  return [
    "Bug details",
    `Title: ${bug.title || "Untitled report"}`,
    `Status: ${bug.done ? "Resolved" : "Open"}`,
    `Filed: ${filedAt}`,
    `Screen: ${bug.screen || "Not provided"}`,
    `Reporter: ${bug.userName || "Unknown"}`,
    `User ID: ${bug.userId || "Unavailable"}`,
    `Bug ID: ${bug.id}`,
    "",
    "Description:",
    bug.description || "No description provided.",
  ].join("\n");
}

export function createLatestRequestGate() {
  let sequence = 0;
  return {
    begin() {
      sequence += 1;
      return sequence;
    },
    invalidate() {
      sequence += 1;
    },
    isCurrent(requestId) {
      return requestId === sequence;
    },
  };
}
