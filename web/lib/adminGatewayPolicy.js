const OBJECT_ID = /^[a-f0-9]{24}$/i;

function hasOnlyParams(params, allowed) {
  const seen = new Set();
  for (const [key, value] of params) {
    if (!allowed.has(key) || seen.has(key) || value.length > 100) return false;
    seen.add(key);
  }
  return true;
}

function integerInRange(value, minimum, maximum) {
  return (
    /^\d+$/.test(value) && Number(value) >= minimum && Number(value) <= maximum
  );
}

function validDate(value) {
  return value.length <= 40 && !Number.isNaN(Date.parse(value));
}

/** Exact read allowlist for the browser-facing admin BFF. */
export function isAllowedAdminRead(segments, params) {
  if (segments.length === 1) {
    const [resource] = segments;
    if (resource === "health") return hasOnlyParams(params, new Set());
    if (resource === "stats") {
      return (
        hasOnlyParams(params, new Set(["from", "to", "days"])) &&
        (!params.has("from") || validDate(params.get("from") ?? "")) &&
        (!params.has("to") || validDate(params.get("to") ?? "")) &&
        (!params.has("days") ||
          integerInRange(params.get("days") ?? "", 1, 365))
      );
    }
    if (resource === "trends") {
      return (
        hasOnlyParams(params, new Set(["days"])) &&
        (!params.has("days") ||
          integerInRange(params.get("days") ?? "", 1, 180))
      );
    }
    if (resource === "bugs") {
      return (
        hasOnlyParams(params, new Set(["status", "page", "limit"])) &&
        (!params.has("status") ||
          /^(open|resolved|all)$/.test(params.get("status") ?? "")) &&
        (!params.has("page") ||
          integerInRange(params.get("page") ?? "", 1, 10_000)) &&
        (!params.has("limit") ||
          integerInRange(params.get("limit") ?? "", 1, 50))
      );
    }
    return false;
  }

  return (
    segments.length === 2 &&
    segments[0] === "bugs" &&
    OBJECT_ID.test(segments[1]) &&
    hasOnlyParams(params, new Set())
  );
}

export function isAllowedAdminPatch(segments) {
  return (
    segments.length === 2 &&
    segments[0] === "bugs" &&
    OBJECT_ID.test(segments[1])
  );
}

export function isAllowedAdminDelete(segments) {
  return (
    segments.length === 2 && segments[0] === "bugs" && segments[1] === "done"
  );
}

export function isValidAdminBugPatchBody(body) {
  return (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    typeof body.done === "boolean"
  );
}
