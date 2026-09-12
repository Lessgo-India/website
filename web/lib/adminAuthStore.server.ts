import "server-only";

import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { MongoClient, type Collection } from "mongodb";
import { trustedClientAddress } from "./adminLoginRateLimitPolicy.js";

const CREDENTIAL_COLLECTION = "admin_credentials";
const SESSION_COLLECTION = "admin_sessions";
const OTP_COLLECTION = "admin_password_change_otps";
const RATE_LIMIT_COLLECTION = "admin_auth_rate_limits";
const OTP_TTL_MS = 10 * 60_000;
const OTP_RETENTION_MS = 30 * 60_000;
const OTP_REQUEST_WINDOW_MS = 15 * 60_000;
const OTP_REQUEST_LIMIT = 3;
const OTP_ADDRESS_REQUEST_LIMIT = 10;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60_000;

interface AdminCredentialDocument {
  _id: string;
  saltHex: string;
  hashHex: string;
  generation: number;
  lastPasswordChangeChallengeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminSessionDocument {
  _id: string;
  phone: string;
  initiatingSessionId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  credentialGeneration: number;
  userAgent: string;
  ipAddress: string;
  revokedAt?: Date;
}

interface AdminPasswordChangeOtpDocument {
  _id: string;
  challengeId: string;
  phone: string;
  codeHash: string;
  addressHash: string;
  attempts: number;
  state: "pending" | "verified" | "applied" | "invalidated";
  createdAt: Date;
  expiresAt: Date;
  deleteAt: Date;
  usedAt?: Date;
  verifiedAt?: Date;
  appliedAt?: Date;
  credentialSaltHex?: string;
  credentialHashHex?: string;
  replacementSessionId?: string;
}

interface AdminAuthRateLimitDocument {
  _id: string;
  count: number;
  expiresAt: Date;
}

interface AdminAuthCollections {
  credentials: Collection<AdminCredentialDocument>;
  sessions: Collection<AdminSessionDocument>;
  otps: Collection<AdminPasswordChangeOtpDocument>;
  rateLimits: Collection<AdminAuthRateLimitDocument>;
}

interface AdminAuthMongoCache {
  uri: string;
  database?: string;
  clientPromise: Promise<MongoClient>;
  collectionsPromise?: Promise<AdminAuthCollections>;
}

const mongoGlobal = globalThis as typeof globalThis & {
  __lessgoAdminAuthMongo?: AdminAuthMongoCache;
};

export class AdminOtpRateLimitError extends Error {}

export interface AdminSessionView {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  browser: string;
  device: string;
  ipAddress: string;
  current: boolean;
}

export function isAdminAuthStorageConfigured(): boolean {
  return Boolean(getConfig().uri);
}

export async function getCredentialOverride(
  phone: string,
): Promise<{ salt: Buffer; hash: Buffer; generation: number } | null> {
  const { credentials } = await getCollections();
  const record = await credentials.findOne({ _id: phone });
  if (!record) return null;
  return {
    salt: Buffer.from(record.saltHex, "hex"),
    hash: Buffer.from(record.hashHex, "hex"),
    generation: record.generation,
  };
}

export async function saveCredentialOverride(
  phone: string,
  salt: Buffer,
  hash: Buffer,
  challengeId?: string,
): Promise<void> {
  const { credentials } = await getCollections();
  const now = new Date();
  await credentials.updateOne(
    { _id: phone },
    {
      $set: {
        saltHex: salt.toString("hex"),
        hashHex: hash.toString("hex"),
        ...(challengeId ? { lastPasswordChangeChallengeId: challengeId } : {}),
        updatedAt: now,
      },
      $setOnInsert: { _id: phone, generation: 1, createdAt: now },
    },
    { upsert: true },
  );
}

export async function createStoredSession(input: {
  phone: string;
  request: Request;
  expiresAt: Date;
  credentialGeneration: number;
  sessionId?: string;
}): Promise<string> {
  const { sessions } = await getCollections();
  const now = new Date();
  const sessionId = input.sessionId ?? randomUUID();
  await sessions.updateOne(
    { _id: sessionId },
    {
      $setOnInsert: {
        _id: sessionId,
        phone: input.phone,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: input.expiresAt,
        credentialGeneration: input.credentialGeneration,
        userAgent: boundedUserAgent(input.request.headers.get("user-agent")),
        ipAddress: trustedClientAddress(input.request.headers),
      },
    },
    { upsert: true },
  );
  return sessionId;
}

export async function validateStoredSession(
  phone: string,
  sessionId: string,
  credentialGeneration: number,
): Promise<boolean> {
  const { credentials, sessions } = await getCollections();
  const now = new Date();
  const credential = await credentials.findOne(
    { _id: phone },
    { projection: { generation: 1 } },
  );
  if ((credential?.generation ?? 0) !== credentialGeneration) return false;
  const session = await sessions.findOne({
    _id: sessionId,
    phone,
    credentialGeneration,
    expiresAt: { $gt: now },
    revokedAt: { $exists: false },
  });
  if (!session) return false;
  if (
    now.getTime() - session.lastSeenAt.getTime() >=
    SESSION_TOUCH_INTERVAL_MS
  ) {
    await sessions.updateOne(
      {
        _id: sessionId,
        phone,
        revokedAt: { $exists: false },
        lastSeenAt: session.lastSeenAt,
      },
      { $set: { lastSeenAt: now } },
    );
  }
  return true;
}

export async function listStoredSessions(
  phone: string,
  currentSessionId: string,
): Promise<AdminSessionView[]> {
  const { sessions } = await getCollections();
  const now = new Date();
  const generation = await getCredentialGeneration(phone);
  const rows = await sessions
    .find({
      phone,
      credentialGeneration: generation,
      expiresAt: { $gt: now },
      revokedAt: { $exists: false },
    })
    .sort({ lastSeenAt: -1 })
    .limit(100)
    .toArray();
  return rows.map((row) => ({
    id: row._id,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    browser: browserName(row.userAgent),
    device: deviceName(row.userAgent),
    ipAddress: row.ipAddress,
    current: row._id === currentSessionId,
  }));
}

export async function revokeStoredSession(
  phone: string,
  sessionId: string,
): Promise<boolean> {
  const { sessions } = await getCollections();
  const result = await sessions.updateOne(
    { _id: sessionId, phone, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function revokeOtherStoredSessions(
  phone: string,
  currentSessionId: string,
): Promise<number> {
  const { sessions } = await getCollections();
  const now = new Date();
  const result = await sessions.updateMany(
    {
      phone,
      _id: { $ne: currentSessionId },
      expiresAt: { $gt: now },
      revokedAt: { $exists: false },
    },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount;
}

export async function revokeAllStoredSessions(phone: string): Promise<number> {
  const { sessions } = await getCollections();
  const result = await sessions.updateMany(
    { phone, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount;
}

export async function createPasswordChangeOtp(
  phone: string,
  initiatingSessionId: string,
  request: Request,
): Promise<{ challengeId: string; code: string; expiresAt: Date }> {
  const { otps, rateLimits } = await getCollections();
  const now = new Date();
  const addressHash = auditHash(trustedClientAddress(request.headers));
  const bucketStart =
    Math.floor(now.getTime() / OTP_REQUEST_WINDOW_MS) * OTP_REQUEST_WINDOW_MS;
  const phoneAllowed = await reserveRateLimit(
    rateLimits,
    rateLimitId("otp-phone", phone, bucketStart),
    OTP_REQUEST_LIMIT,
    bucketStart,
  );
  const addressAllowed = await reserveRateLimit(
    rateLimits,
    rateLimitId("otp-address", addressHash, bucketStart),
    OTP_ADDRESS_REQUEST_LIMIT,
    bucketStart,
  );
  if (!phoneAllowed || !addressAllowed) {
    throw new AdminOtpRateLimitError("Too many OTP requests.");
  }
  const challengeId = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  await otps.updateOne(
    { _id: phone },
    {
      $set: {
        challengeId,
        phone,
        initiatingSessionId,
        codeHash: otpHash(challengeId, phone, code),
        addressHash,
        attempts: 0,
        state: "pending",
        createdAt: now,
        expiresAt,
        deleteAt: new Date(now.getTime() + OTP_RETENTION_MS),
      },
      $unset: {
        usedAt: 1,
        verifiedAt: 1,
        appliedAt: 1,
        credentialSaltHex: 1,
        credentialHashHex: 1,
        replacementSessionId: 1,
      },
    },
    { upsert: true },
  );
  return { challengeId, code, expiresAt };
}

export async function cancelPasswordChangeOtp(
  phone: string,
  challengeId: string,
): Promise<void> {
  const { otps } = await getCollections();
  await otps.updateOne(
    { _id: phone, challengeId },
    { $set: { state: "invalidated", usedAt: new Date() } },
  );
}

export async function rotateCredentialWithOtp(input: {
  phone: string;
  initiatingSessionId: string;
  challengeId: string;
  code: string;
  salt: Buffer;
  hash: Buffer;
  request: Request;
  expiresAt: Date;
  resumeOnly?: boolean;
}): Promise<{ sessionId: string; credentialGeneration: number } | null> {
  const { credentials, otps, sessions } = await getCollections();
  const now = new Date();
  let challenge = await otps.findOne({
    _id: input.phone,
    challengeId: input.challengeId,
    initiatingSessionId: input.initiatingSessionId,
  });
  const expected = Buffer.from(challenge?.codeHash ?? "0".repeat(64), "hex");
  const provided = Buffer.from(
    otpHash(input.challengeId, input.phone, input.code),
    "hex",
  );
  const validHash =
    expected.length === provided.length && timingSafeEqual(expected, provided);
  const usable = Boolean(
    challenge &&
    challenge.state === "pending" &&
    challenge.expiresAt > now &&
    challenge.attempts < OTP_MAX_ATTEMPTS,
  );

  if (usable && validHash && !input.resumeOnly) {
    const replacementSessionId = randomUUID();
    challenge = await otps.findOneAndUpdate(
      {
        _id: input.phone,
        challengeId: input.challengeId,
        initiatingSessionId: input.initiatingSessionId,
        state: "pending",
        codeHash: challenge!.codeHash,
        attempts: { $lt: OTP_MAX_ATTEMPTS },
        expiresAt: { $gt: now },
      },
      {
        $set: {
          state: "verified",
          verifiedAt: now,
          credentialSaltHex: input.salt.toString("hex"),
          credentialHashHex: input.hash.toString("hex"),
          replacementSessionId,
        },
      },
      { returnDocument: "after" },
    );
  } else if (!challenge || challenge.state === "pending") {
    if (input.resumeOnly) return null;
    const attempted = await otps.findOneAndUpdate(
      {
        _id: input.phone,
        challengeId: input.challengeId,
        initiatingSessionId: input.initiatingSessionId,
        state: "pending",
        expiresAt: { $gt: now },
        attempts: { $lt: OTP_MAX_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    );
    if (attempted && attempted.attempts >= OTP_MAX_ATTEMPTS) {
      await otps.updateOne(
        {
          _id: input.phone,
          challengeId: input.challengeId,
          initiatingSessionId: input.initiatingSessionId,
          state: "pending",
        },
        { $set: { state: "invalidated", usedAt: now } },
      );
    }
    return null;
  }

  if (!challenge || challenge.state === "invalidated" || !validHash) {
    return null;
  }
  if (
    !challenge.credentialSaltHex ||
    !challenge.credentialHashHex ||
    !challenge.replacementSessionId
  ) {
    throw new Error("The password change challenge is incomplete.");
  }

  let credential = await credentials.findOne({
    _id: input.phone,
    lastPasswordChangeChallengeId: input.challengeId,
  });
  if (!credential) {
    try {
      credential = await credentials.findOneAndUpdate(
        {
          _id: input.phone,
          lastPasswordChangeChallengeId: { $ne: input.challengeId },
        },
        {
          $set: {
            saltHex: challenge.credentialSaltHex,
            hashHex: challenge.credentialHashHex,
            lastPasswordChangeChallengeId: input.challengeId,
            updatedAt: now,
          },
          $inc: { generation: 1 },
          $setOnInsert: { _id: input.phone, createdAt: now },
        },
        { upsert: true, returnDocument: "after" },
      );
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      credential = await credentials.findOne({
        _id: input.phone,
        lastPasswordChangeChallengeId: input.challengeId,
      });
    }
  }
  if (!credential) throw new Error("Credential rotation did not complete.");

  await sessions.updateMany(
    {
      phone: input.phone,
      credentialGeneration: { $ne: credential.generation },
      revokedAt: { $exists: false },
    },
    { $set: { revokedAt: now } },
  );
  await createStoredSession({
    phone: input.phone,
    request: input.request,
    expiresAt: input.expiresAt,
    credentialGeneration: credential.generation,
    sessionId: challenge.replacementSessionId,
  });
  await otps.updateOne(
    {
      _id: input.phone,
      challengeId: input.challengeId,
      initiatingSessionId: input.initiatingSessionId,
      state: { $in: ["verified", "applied"] },
    },
    { $set: { state: "applied", appliedAt: now, usedAt: now } },
  );
  return {
    sessionId: challenge.replacementSessionId,
    credentialGeneration: credential.generation,
  };
}

function getConfig(): { uri: string; database?: string } {
  return {
    uri:
      process.env.ADMIN_AUTH_MONGODB_URL?.trim() ||
      process.env.ADMIN_LOGIN_RATE_LIMIT_MONGODB_URL?.trim() ||
      process.env.MONGODB_URL?.trim() ||
      "",
    database:
      process.env.ADMIN_AUTH_MONGODB_DB?.trim() ||
      process.env.ADMIN_LOGIN_RATE_LIMIT_MONGODB_DB?.trim() ||
      process.env.MONGODB_DB?.trim() ||
      undefined,
  };
}

function getCache(): AdminAuthMongoCache {
  const { uri, database } = getConfig();
  if (!uri) throw new Error("Admin auth storage is not configured.");
  const cached = mongoGlobal.__lessgoAdminAuthMongo;
  if (cached?.uri === uri && cached.database === database) return cached;
  const client = new MongoClient(uri, {
    appName: "lessgo-website-admin-auth",
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8_000,
  });
  const next: AdminAuthMongoCache = {
    uri,
    database,
    clientPromise: client.connect(),
  };
  mongoGlobal.__lessgoAdminAuthMongo = next;
  void next.clientPromise.catch(() => {
    if (mongoGlobal.__lessgoAdminAuthMongo === next) {
      delete mongoGlobal.__lessgoAdminAuthMongo;
    }
  });
  return next;
}

async function getCollections(): Promise<AdminAuthCollections> {
  const cache = getCache();
  if (!cache.collectionsPromise) {
    cache.collectionsPromise = cache.clientPromise.then(async (client) => {
      const database = client.db(cache.database);
      const credentials = database.collection<AdminCredentialDocument>(
        CREDENTIAL_COLLECTION,
      );
      const sessions =
        database.collection<AdminSessionDocument>(SESSION_COLLECTION);
      const otps =
        database.collection<AdminPasswordChangeOtpDocument>(OTP_COLLECTION);
      const rateLimits = database.collection<AdminAuthRateLimitDocument>(
        RATE_LIMIT_COLLECTION,
      );
      await Promise.all([
        sessions.createIndex(
          { expiresAt: 1 },
          { name: "admin_session_expiry", expireAfterSeconds: 0 },
        ),
        sessions.createIndex(
          { phone: 1, revokedAt: 1, lastSeenAt: -1 },
          { name: "admin_session_list" },
        ),
        otps.createIndex(
          { deleteAt: 1 },
          { name: "admin_otp_expiry", expireAfterSeconds: 0 },
        ),
        otps.createIndex(
          { phone: 1, createdAt: -1 },
          { name: "admin_otp_phone_window" },
        ),
        otps.createIndex(
          { addressHash: 1, createdAt: -1 },
          { name: "admin_otp_address_window" },
        ),
        rateLimits.createIndex(
          { expiresAt: 1 },
          { name: "admin_auth_limit_expiry", expireAfterSeconds: 0 },
        ),
      ]);
      return { credentials, sessions, otps, rateLimits };
    });
    void cache.collectionsPromise.catch(() => {
      delete cache.collectionsPromise;
    });
  }
  return cache.collectionsPromise;
}

async function getCredentialGeneration(phone: string): Promise<number> {
  const { credentials } = await getCollections();
  const record = await credentials.findOne(
    { _id: phone },
    { projection: { generation: 1 } },
  );
  return record?.generation ?? 0;
}

async function reserveRateLimit(
  collection: Collection<AdminAuthRateLimitDocument>,
  id: string,
  limit: number,
  bucketStart: number,
): Promise<boolean> {
  try {
    const reserved = await collection.findOneAndUpdate(
      { _id: id, count: { $lt: limit } },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          _id: id,
          expiresAt: new Date(bucketStart + OTP_REQUEST_WINDOW_MS * 2),
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    return Boolean(reserved);
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    const reserved = await collection.findOneAndUpdate(
      { _id: id, count: { $lt: limit } },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    );
    return Boolean(reserved);
  }
}

function rateLimitId(
  scope: string,
  value: string,
  bucketStart: number,
): string {
  return createHmac("sha256", authSecret())
    .update(`${scope}:${value}:${bucketStart}`)
    .digest("hex");
}

function otpHash(challengeId: string, phone: string, code: string): string {
  return createHmac("sha256", authSecret())
    .update(`otp:${challengeId}:${phone}:${code}`)
    .digest("hex");
}

function auditHash(value: string): string {
  return createHmac("sha256", authSecret())
    .update(`audit:${value}`)
    .digest("hex");
}

function authSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return secret;
}

function boundedUserAgent(value: string | null): string {
  return (value ?? "Unknown browser").slice(0, 512);
}

function browserName(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return "Microsoft Edge";
  if (/CriOS|Chrome\//.test(userAgent)) return "Google Chrome";
  if (/FxiOS|Firefox\//.test(userAgent)) return "Mozilla Firefox";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Unknown browser";
}

function deviceName(userAgent: string): string {
  if (/iPad/.test(userAgent)) return "iPad";
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/Android/.test(userAgent)) return "Android device";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows PC";
  if (/Linux/.test(userAgent)) return "Linux device";
  return "Unknown device";
}
