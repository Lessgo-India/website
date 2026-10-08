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
const USER_REPORT_STATUSES = new Set([
  "open",
  "in_review",
  "resolved",
  "dismissed",
]);
const USER_REPORT_CATEGORIES = new Set([
  "harassment_or_bullying",
  "impersonation",
  "spam_or_scam",
  "inappropriate_content_or_behavior",
  "safety_concern",
  "other",
]);
const URL_SAFE_BASE64 = /^[A-Za-z0-9_-]+={0,2}$/;

// Admin → Partners (web/lib/adminPartnersApi.ts). Ids as the offers service
// mints them; user ids and handles as web/lib/partner/onboarding.ts allows.
const PARTNER_ID = /^ptr_[a-z0-9][a-z0-9_]{0,47}$/;
const PARTNER_APPLICATION_ID = /^app_[a-f0-9]{24}$/;
const CAMPAIGN_ID = /^cmp_[A-Za-z0-9_-]{1,64}$/;
const PARTNER_USER_ID = /^[a-z][a-z0-9]{2,15}\.[a-z][a-z0-9]{1,23}$/;
const PARTNER_HANDLE = /^[a-z][a-z0-9]{2,15}$/;
const OUTLET_ID = /^[A-Za-z0-9_-]{1,80}$/;
const ONLINE_CHANNELS = new Set(["online_code", "api_booking"]);
const REDEMPTION_CHANNELS = ["in_store", "online_code", "api_booking"];
const BOOKING_PRODUCTS = [
  "movie_tickets",
  "event_tickets",
  "flights",
  "hotels",
  "buses",
  "activities",
];
const BOOKING_METHODS = new Set(["lessgo_connect", "adapter"]);
const PARTNER_PLANS = new Set(["pilot", "standard", "enterprise"]);
const PARTNER_ROLES = new Set(["owner", "manager", "cashier"]);

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
    if (resource === "reports") {
      return (
        hasOnlyParams(
          params,
          new Set(["status", "category", "cursor", "limit"]),
        ) &&
        (!params.has("status") ||
          USER_REPORT_STATUSES.has(params.get("status") ?? "")) &&
        (!params.has("category") ||
          USER_REPORT_CATEGORIES.has(params.get("category") ?? "")) &&
        (!params.has("cursor") ||
          OBJECT_ID.test(params.get("cursor") ?? "")) &&
        (!params.has("limit") ||
          integerInRange(params.get("limit") ?? "", 1, 50))
      );
    }
    if (resource === "partners") return hasOnlyParams(params, new Set());
    return false;
  }

  if (segments.length === 2 && segments[0] === "partners") {
    return PARTNER_ID.test(segments[1]) && hasOnlyParams(params, new Set());
  }
  if (segments.length === 2 && segments[0] === "partner-handles") {
    return PARTNER_HANDLE.test(segments[1]) && hasOnlyParams(params, new Set());
  }

  if (segments[0] === "notifications") {
    if (
      segments.length === 3 &&
      segments[1] === "alerts" &&
      segments[2] === "capabilities"
    ) {
      return hasOnlyParams(params, new Set());
    }
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
    ["bugs", "reports"].includes(segments[0]) &&
    OBJECT_ID.test(segments[1]) &&
    hasOnlyParams(params, new Set())
  );
}

export function isAllowedAdminPost(segments) {
  if (
    segments[0] === "partners" ||
    segments[0] === "partner-applications" ||
    segments[0] === "campaigns"
  ) {
    return partnerPostKind(segments) !== null;
  }
  if (segments[0] !== "notifications") return false;
  if (
    segments.length === 3 &&
    segments[1] === "alerts" &&
    ["subscriptions", "test"].includes(segments[2])
  ) {
    return true;
  }
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

export function isAdminPartnerLogoUpload(segments) {
  return (
    segments.length === 2 &&
    segments[0] === "partners" &&
    segments[1] === "logo"
  );
}

/**
 * Admin → Partners POSTs (web/lib/adminPartnersApi.ts), or null:
 *   partners                                          onboard
 *   partners/logo                                     upload-logo
 *   partners/:id/logins                               login
 *   partners/:id/logins/:userId/reset-password        reset-password
 *   partners/:id/integrations/:channel/approve        approve (no body)
 *   partners/:id/integrations/:channel/rollback       rollback
 *   partner-applications/:id/approve                   application approval
 *   partner-applications/:id/reject                    application rejection
 *   campaigns/:id/review                              review
 */
function partnerPostKind(segments) {
  const [resource, id, child, childId, action] = segments;
  if (segments.length === 1 && resource === "partners") return "onboard";
  if (
    segments.length === 3 &&
    resource === "partner-applications" &&
    PARTNER_APPLICATION_ID.test(id ?? "") &&
    (child === "approve" || child === "reject")
  ) {
    return `application-${child}`;
  }
  if (isAdminPartnerLogoUpload(segments)) return "upload-logo";
  if (
    segments.length === 3 &&
    resource === "campaigns" &&
    CAMPAIGN_ID.test(id) &&
    child === "review"
  ) {
    return "review";
  }
  if (resource !== "partners" || !PARTNER_ID.test(id ?? "")) return null;
  if (segments.length === 3 && child === "logins") return "login";
  if (
    segments.length === 5 &&
    child === "logins" &&
    PARTNER_USER_ID.test(childId) &&
    action === "reset-password"
  ) {
    return "reset-password";
  }
  if (
    segments.length === 5 &&
    child === "integrations" &&
    ONLINE_CHANNELS.has(childId) &&
    (action === "approve" || action === "rollback")
  ) {
    return action;
  }
  return null;
}

/** Allowed POSTs that take no body: campaign actions, the alert test and go-live approval. */
export function isBodylessAdminPost(segments) {
  if (segments[0] === "notifications") {
    return (
      (segments.length === 4 && segments[1] === "campaigns") ||
      segments.join("/") === "notifications/alerts/test"
    );
  }
  return partnerPostKind(segments) === "approve";
}

export function isValidAdminPostBody(segments, body) {
  if (!isPlainObject(body)) return false;
  const partnerPost = partnerPostKind(segments);
  if (partnerPost === "onboard") return validOnboardingInput(body);
  if (partnerPost === "login") return validNewLoginInput(body);
  if (partnerPost === "reset-password") {
    return exactKeys(body, ["dispatch"]) && validDispatch(body.dispatch);
  }
  if (partnerPost === "rollback") {
    return exactKeys(body, ["reason"]) && boundedString(body.reason, 1_000);
  }
  if (partnerPost === "review") return validReviewDecision(body);
  if (partnerPost === "application-approve") {
    return validApplicationApproval(body);
  }
  if (partnerPost === "application-reject") {
    return (
      exactKeys(body, ["reason"]) &&
      validString(body.reason, 5, 1_000)
    );
  }
  if (partnerPost) return false;
  if (
    segments.length === 3 &&
    segments[1] === "alerts" &&
    segments[2] === "subscriptions"
  ) {
    return validWebPushSubscription(body);
  }
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
  if (partnerPatchKind(segments)) return true;
  if (
    segments.length === 3 &&
    segments[0] === "notifications" &&
    segments[1] === "alerts" &&
    segments[2] === "preferences"
  ) {
    return true;
  }
  if (
    segments.length === 2 &&
    segments[0] === "reports" &&
    OBJECT_ID.test(segments[1])
  ) {
    return true;
  }
  return (
    segments.length === 2 &&
    segments[0] === "bugs" &&
    OBJECT_ID.test(segments[1])
  );
}

export function isAllowedAdminDelete(segments) {
  if (
    segments.length === 3 &&
    segments[0] === "notifications" &&
    segments[1] === "alerts" &&
    segments[2] === "subscriptions"
  ) {
    return true;
  }
  return (
    segments.length === 2 && segments[0] === "bugs" && segments[1] === "done"
  );
}

/**
 * Admin → Partners PATCHes, or null:
 *   partners/:id                  status   (suspend / reactivate)
 *   partners/:id/channels         channels
 *   partners/:id/logins/:userId   login-status
 */
function partnerPatchKind(segments) {
  const [resource, id, child, userId] = segments;
  if (resource !== "partners" || !PARTNER_ID.test(id ?? "")) return null;
  if (segments.length === 2) return "status";
  if (segments.length === 3 && child === "channels") return "channels";
  if (
    segments.length === 4 &&
    child === "logins" &&
    PARTNER_USER_ID.test(userId)
  ) {
    return "login-status";
  }
  return null;
}

/** Body check for every allowed PATCH (see isAllowedAdminPatch). */
export function isValidAdminPatchBody(segments, body) {
  const partnerPatch = partnerPatchKind(segments);
  if (partnerPatch === "status") return validPartnerStatusChange(body);
  if (partnerPatch === "channels") return validChannelsInput(body);
  if (partnerPatch === "login-status") {
    return (
      isPlainObject(body) &&
      exactKeys(body, ["status"]) &&
      (body.status === "active" || body.status === "disabled")
    );
  }
  if (segments[0] === "bugs") return isValidAdminBugPatchBody(body);
  if (segments[0] === "reports") return isValidAdminReportPatchBody(body);
  if (segments.join("/") === "notifications/alerts/preferences") {
    return isValidAdminAlertPreferencesBody(body);
  }
  return false;
}

// ── Admin → Partners bodies ─────────────────────────────────────────────────
// Shape only (keys, types, sizes): the offers service owns the business rules
// and its 409/422 messages, so lengths here are generous ceilings.

function boundedString(value, maximum) {
  return typeof value === "string" && value.length <= maximum;
}

function enumList(value, allowedValues) {
  return (
    Array.isArray(value) &&
    optionalEnumArray(value, allowedValues, allowedValues.length)
  );
}

function validDispatch(value) {
  return (
    isPlainObject(value) &&
    exactKeys(value, ["email"]) &&
    typeof value.email === "boolean"
  );
}

const ONBOARDING_TEXT_LIMITS = {
  brandName: 80,
  legalName: 200,
  category: 60,
  website: 2_048,
  gstin: 32,
  city: 80,
  stateCode: 4,
  logoEmoji: 16,
  brandColor: 16,
  contactName: 100,
  contactEmail: 254,
  contactPhone: 32,
  handle: 32,
};

/** PartnerOnboardingInput (POST partners). */
function validOnboardingInput(body) {
  return (
    hasAllowedExactKeys(body, [
      ...Object.keys(ONBOARDING_TEXT_LIMITS),
      "logoUrl",
      "channels",
      "bookingProducts",
      "bookingMethod",
      "plan",
      "owner",
      "dispatch",
    ]) &&
    Object.entries(ONBOARDING_TEXT_LIMITS).every(([key, maximum]) =>
      boundedString(body[key], maximum),
    ) &&
    (body.logoUrl === undefined || boundedString(body.logoUrl, 2_048)) &&
    enumList(body.channels, REDEMPTION_CHANNELS) &&
    enumList(body.bookingProducts, BOOKING_PRODUCTS) &&
    BOOKING_METHODS.has(body.bookingMethod) &&
    PARTNER_PLANS.has(body.plan) &&
    isPlainObject(body.owner) &&
    exactKeys(body.owner, ["name", "email", "phone"]) &&
    boundedString(body.owner.name, 100) &&
    boundedString(body.owner.email, 254) &&
    boundedString(body.owner.phone, 32) &&
    validDispatch(body.dispatch)
  );
}

function validApplicationApproval(body) {
  return (
    exactKeys(body, [
      "handle",
      "logoEmoji",
      "brandColor",
      "plan",
      "dispatch",
    ]) &&
    boundedString(body.handle, 32) &&
    boundedString(body.logoEmoji, 16) &&
    boundedString(body.brandColor, 16) &&
    PARTNER_PLANS.has(body.plan) &&
    validDispatch(body.dispatch)
  );
}

/** NewPartnerLoginInput (POST partners/:id/logins). */
function validNewLoginInput(body) {
  return (
    hasAllowedExactKeys(body, [
      "name",
      "email",
      "phone",
      "role",
      "outletId",
      "dispatch",
    ]) &&
    boundedString(body.name, 100) &&
    boundedString(body.email, 254) &&
    (body.phone === undefined || boundedString(body.phone, 32)) &&
    PARTNER_ROLES.has(body.role) &&
    (body.outletId === undefined ||
      (typeof body.outletId === "string" && OUTLET_ID.test(body.outletId))) &&
    validDispatch(body.dispatch)
  );
}

/** { status: "suspended", reason } | { status: "active" } (PATCH partners/:id). */
function validPartnerStatusChange(body) {
  if (!isPlainObject(body)) return false;
  if (body.status === "active") return exactKeys(body, ["status"]);
  return (
    body.status === "suspended" &&
    exactKeys(body, ["status", "reason"]) &&
    boundedString(body.reason, 1_000)
  );
}

/** PartnerChannelsInput (PATCH partners/:id/channels). */
function validChannelsInput(body) {
  return (
    isPlainObject(body) &&
    hasAllowedExactKeys(body, [
      "channels",
      "website",
      "bookingProducts",
      "bookingMethod",
    ]) &&
    enumList(body.channels, REDEMPTION_CHANNELS) &&
    (body.website === undefined || boundedString(body.website, 2_048)) &&
    (body.bookingProducts === undefined ||
      enumList(body.bookingProducts, BOOKING_PRODUCTS)) &&
    (body.bookingMethod === undefined || BOOKING_METHODS.has(body.bookingMethod))
  );
}

/** CampaignReviewDecision (POST campaigns/:id/review). */
function validReviewDecision(body) {
  if (body.decision === "approve") return exactKeys(body, ["decision"]);
  return (
    body.decision === "reject" &&
    exactKeys(body, ["decision", "note"]) &&
    boundedString(body.note, 2_000)
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

export function isValidAdminReportPatchBody(body) {
  if (!isPlainObject(body)) return false;
  if (!hasAllowedExactKeys(body, ["status", "note", "revision"])) {
    return false;
  }
  if (!Number.isInteger(body.revision) || body.revision < 0) return false;
  if (
    body.status !== undefined &&
    !USER_REPORT_STATUSES.has(body.status)
  ) {
    return false;
  }
  if (
    body.note !== undefined &&
    (typeof body.note !== "string" || body.note.length > 2_000)
  ) {
    return false;
  }
  return body.status !== undefined || body.note?.trim().length > 0;
}

export function isValidAdminAlertPreferencesBody(body) {
  return (
    isPlainObject(body) &&
    exactKeys(body, [
      "enabled",
      "bugs",
      "campaigns",
      "serviceHealth",
    ]) &&
    ["enabled", "bugs", "campaigns", "serviceHealth"].every(
      (key) => typeof body[key] === "boolean",
    )
  );
}

export function isValidAdminAlertUnsubscribeBody(body) {
  return (
    isPlainObject(body) &&
    exactKeys(body, ["endpoint"]) &&
    validPushEndpoint(body.endpoint)
  );
}

function validWebPushSubscription(body) {
  return (
    exactKeys(body, ["endpoint", "keys"]) &&
    validPushEndpoint(body.endpoint) &&
    isPlainObject(body.keys) &&
    exactKeys(body.keys, ["p256dh", "auth"]) &&
    validBase64Url(body.keys.p256dh, 20, 512) &&
    validBase64Url(body.keys.auth, 8, 128)
  );
}

function validPushEndpoint(value) {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validBase64Url(value, minimum, maximum) {
  return (
    typeof value === "string" &&
    value.length >= minimum &&
    value.length <= maximum &&
    URL_SAFE_BASE64.test(value)
  );
}
