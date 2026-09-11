const OBJECT_ID = /^[a-f0-9]{24}$/i;
const UUID_V4 =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PURPOSES = new Set(["lessgo_update", "marketing"]);
const DESTINATIONS = new Set([
  "home",
  "events",
  "vibes",
  "balances",
  "profile",
  "event",
  "group",
]);
const CAMPAIGN_STATES = new Set([
  "scheduled",
  "materializing",
  "queued",
  "sending",
  "completed",
  "completed_with_failures",
  "cancel_requested",
  "cancelled",
  "failed",
]);

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

  if (segments[0] === "notifications") {
    if (segments.length === 2 && segments[1] === "capabilities") {
      return hasOnlyParams(params, new Set());
    }
    if (segments.length === 2 && segments[1] === "events") {
      return (
        hasOnlyParams(params, new Set(["query", "limit"])) &&
        (!params.has("query") || (params.get("query") ?? "").length <= 80) &&
        (!params.has("limit") ||
          integerInRange(params.get("limit") ?? "", 1, 50))
      );
    }
    if (segments.length === 2 && segments[1] === "campaigns") {
      return (
        hasOnlyParams(
          params,
          new Set(["state", "purpose", "limit", "before"]),
        ) &&
        (!params.has("state") ||
          CAMPAIGN_STATES.has(params.get("state") ?? "")) &&
        (!params.has("purpose") || PURPOSES.has(params.get("purpose") ?? "")) &&
        (!params.has("limit") ||
          integerInRange(params.get("limit") ?? "", 1, 100)) &&
        (!params.has("before") || OBJECT_ID.test(params.get("before") ?? ""))
      );
    }
    if (
      segments.length === 3 &&
      (segments[1] === "previews" || segments[1] === "campaigns") &&
      OBJECT_ID.test(segments[2])
    ) {
      return hasOnlyParams(params, new Set());
    }
  }

  return (
    segments.length === 2 &&
    segments[0] === "bugs" &&
    OBJECT_ID.test(segments[1]) &&
    hasOnlyParams(params, new Set())
  );
}

export function isAllowedAdminPost(segments) {
  if (segments[0] !== "notifications") return false;
  if (
    segments.length === 2 &&
    ["previews", "test", "campaigns"].includes(segments[1])
  ) {
    return true;
  }
  return (
    segments.length === 4 &&
    segments[1] === "campaigns" &&
    OBJECT_ID.test(segments[2]) &&
    ["cancel", "retry-failures"].includes(segments[3])
  );
}

export function isValidAdminPostBody(segments, body) {
  if (!isPlainObject(body)) return false;
  if (segments[1] === "previews") {
    return (
      exactKeys(body, ["purpose", "audience"]) &&
      PURPOSES.has(body.purpose) &&
      validAudience(body.audience)
    );
  }
  if (segments[1] === "test") {
    return validMessage(body, [
      "previewId",
      "purpose",
      "title",
      "body",
      "destination",
      "destinationId",
    ]);
  }
  if (segments.length === 2 && segments[1] === "campaigns") {
    return (
      validMessage(body, [
        "name",
        "previewId",
        "purpose",
        "title",
        "body",
        "destination",
        "destinationId",
        "scheduledAt",
        "confirmation",
        "idempotencyKey",
      ]) &&
      validString(body.name, 3, 80) &&
      validString(body.confirmation, 0, 80) &&
      UUID_V4.test(body.idempotencyKey ?? "") &&
      (body.scheduledAt === undefined || validDate(body.scheduledAt))
    );
  }
  return false;
}

function validMessage(body, allowedKeys) {
  if (!hasAllowedExactKeys(body, allowedKeys)) return false;
  if (
    !OBJECT_ID.test(body.previewId ?? "") ||
    !PURPOSES.has(body.purpose) ||
    !validString(body.title, 1, 80) ||
    !validString(body.body, 1, 500) ||
    !DESTINATIONS.has(body.destination)
  ) {
    return false;
  }
  const needsId = body.destination === "event" || body.destination === "group";
  return needsId
    ? OBJECT_ID.test(body.destinationId ?? "")
    : body.destinationId === undefined;
}

function validAudience(audience) {
  if (!isPlainObject(audience)) return false;
  const allowed = [
    "minAge",
    "maxAge",
    "genders",
    "eventMode",
    "lookbackDays",
    "eventId",
    "anchorEventId",
    "radiusKm",
    "eventTypes",
    "roles",
    "rsvpStatuses",
  ];
  if (!hasAllowedExactKeys(audience, allowed)) return false;
  if (
    !["none", "recent", "specific", "near_event"].includes(audience.eventMode)
  ) {
    return false;
  }
  if (!optionalInteger(audience.minAge, 0, 120)) return false;
  if (!optionalInteger(audience.maxAge, 0, 120)) return false;
  if (
    audience.minAge !== undefined &&
    audience.maxAge !== undefined &&
    audience.minAge > audience.maxAge
  ) {
    return false;
  }
  if (!optionalEnumArray(audience.genders, ["M", "F", "T"], 3)) return false;
  if (
    !optionalEnumArray(
      audience.eventTypes,
      [
        "HANGOUT",
        "TRIP",
        "MEETING",
        "WORKSHOP",
        "PARTY",
        "SPORTS",
        "GROUP_STUDY",
        "DINNER",
        "CONFERENCE",
        "EVENT",
        "MOVIE",
        "CONCERT",
        "GAMING",
        "BIRTHDAY",
        "COFFEE",
        "DRINKS",
        "OUTDOORS",
        "PICNIC",
        "ROADTRIP",
        "SHOPPING",
        "FESTIVAL",
        "FITNESS",
        "OTHER",
      ],
      23,
    )
  )
    return false;
  if (!optionalEnumArray(audience.roles, [0, 1, 2], 3)) return false;
  if (!optionalEnumArray(audience.rsvpStatuses, [-1, 0, 1, 2], 4)) return false;
  if (!optionalInteger(audience.radiusKm, 1, 200)) return false;
  if (
    audience.lookbackDays !== undefined &&
    ![7, 30, 90, 180].includes(audience.lookbackDays)
  )
    return false;
  if (audience.eventId !== undefined && !OBJECT_ID.test(audience.eventId))
    return false;
  if (
    audience.anchorEventId !== undefined &&
    !OBJECT_ID.test(audience.anchorEventId)
  )
    return false;
  return true;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function hasAllowedExactKeys(value, keys) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validString(value, minimum, maximum) {
  return (
    typeof value === "string" &&
    value.trim().length >= minimum &&
    value.length <= maximum
  );
}

function optionalInteger(value, minimum, maximum) {
  return (
    value === undefined ||
    (Number.isInteger(value) && value >= minimum && value <= maximum)
  );
}

function optionalEnumArray(value, allowedValues, maximum) {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > maximum) return false;
  const allowed = new Set(allowedValues);
  return (
    new Set(value).size === value.length &&
    value.every((item) => allowed.has(item))
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
