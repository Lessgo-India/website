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
