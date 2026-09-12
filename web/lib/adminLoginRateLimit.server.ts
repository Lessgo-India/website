import 'server-only';

import { createHmac } from 'node:crypto';
import { MongoClient, type Collection } from 'mongodb';
import {
  rateLimitSubjects,
  trustedClientAddress,
} from './adminLoginRateLimitPolicy.js';

const COLLECTION_NAME = 'admin_login_rate_limits';
const WINDOW_MS = 5 * 60_000;
const MAX_LOCAL_BUCKETS = 2_000;

interface RateLimitDocument {
  _id: string;
  count: number;
  expiresAt: Date;
}

interface RateLimitCache {
  uri: string;
  database?: string;
  clientPromise: Promise<MongoClient>;
  collectionPromise?: Promise<Collection<RateLimitDocument>>;
}

const rateLimitGlobal = globalThis as typeof globalThis & {
  __lessgoAdminRateLimitMongo?: RateLimitCache;
};
const localBuckets = new Map<string, { count: number; resetAt: number }>();

export type AdminLoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'limited' | 'unavailable' };

export async function consumeAdminLoginAddressRateLimit(
  request: Request,
): Promise<AdminLoginRateLimitResult> {
  const address = trustedClientAddress(request.headers);
  return consumeSubjects([
    { scope: 'address', value: address, limit: 20 },
  ]);
}

export async function consumeAdminLoginPhoneRateLimit(
  request: Request,
  phone: string,
): Promise<AdminLoginRateLimitResult> {
  const address = trustedClientAddress(request.headers);
  const subjects = rateLimitSubjects(address, phone).filter(
    (subject) => subject.scope !== 'address',
  );
  return consumeSubjects(subjects);
}

async function consumeSubjects(
  subjects: Array<{ scope: string; value: string; limit: number }>,
): Promise<AdminLoginRateLimitResult> {
  const config = getConfig();

  if (!config.uri) {
    if (process.env.NODE_ENV === 'production') {
      return { allowed: false, reason: 'unavailable' };
    }
    return subjects.every((subject) => consumeLocal(subject))
      ? { allowed: true }
      : { allowed: false, reason: 'limited' };
  }

  try {
    const collection = await getCollection(config);
    const bucketStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
    for (const subject of subjects) {
      const allowed = await reserveBucket(
        collection,
        bucketId(subject.scope, subject.value, bucketStart),
        subject.limit,
        bucketStart,
      );
      if (!allowed) return { allowed: false, reason: 'limited' };
    }
    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'unavailable' };
  }
}

function getConfig(): { uri: string; database?: string } {
  return {
    uri:
      process.env.ADMIN_LOGIN_RATE_LIMIT_MONGODB_URL?.trim() ||
      process.env.MONGODB_URL?.trim() ||
      '',
    database:
      process.env.ADMIN_LOGIN_RATE_LIMIT_MONGODB_DB?.trim() ||
      process.env.MONGODB_DB?.trim() ||
      undefined,
  };
}

function getCache(config: { uri: string; database?: string }): RateLimitCache {
  const cached = rateLimitGlobal.__lessgoAdminRateLimitMongo;
  if (cached?.uri === config.uri && cached.database === config.database) {
    return cached;
  }
  const client = new MongoClient(config.uri, {
    appName: 'lessgo-website-admin-login-limit',
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 5_000,
  });
  const clientPromise = client.connect();
  const next: RateLimitCache = { ...config, clientPromise };
  rateLimitGlobal.__lessgoAdminRateLimitMongo = next;
  void clientPromise.catch(() => {
    if (rateLimitGlobal.__lessgoAdminRateLimitMongo === next) {
      delete rateLimitGlobal.__lessgoAdminRateLimitMongo;
    }
  });
  return next;
}

async function getCollection(config: {
  uri: string;
  database?: string;
}): Promise<Collection<RateLimitDocument>> {
  const cache = getCache(config);
  if (!cache.collectionPromise) {
    const collectionPromise = cache.clientPromise.then(async (client) => {
      const collection = client
        .db(cache.database)
        .collection<RateLimitDocument>(COLLECTION_NAME);
      await collection.createIndex(
        { expiresAt: 1 },
        { name: 'expires_at_ttl', expireAfterSeconds: 0 },
      );
      return collection;
    });
    cache.collectionPromise = collectionPromise;
    void collectionPromise.catch(() => {
      if (cache.collectionPromise === collectionPromise) {
        delete cache.collectionPromise;
      }
    });
  }
  return cache.collectionPromise;
}

async function reserveBucket(
  collection: Collection<RateLimitDocument>,
  id: string,
  limit: number,
  bucketStart: number,
): Promise<boolean> {
  const expiresAt = new Date(bucketStart + WINDOW_MS * 2);
  try {
    const reserved = await collection.findOneAndUpdate(
      { _id: id, count: { $lt: limit } },
      {
        $inc: { count: 1 },
        $setOnInsert: { _id: id, expiresAt },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return Boolean(reserved);
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    const reserved = await collection.findOneAndUpdate(
      { _id: id, count: { $lt: limit } },
      { $inc: { count: 1 } },
      { returnDocument: 'after' },
    );
    return Boolean(reserved);
  }
}

function bucketId(scope: string, value: string, bucketStart: number): string {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET ?? '')
    .update(`${scope}:${value}:${bucketStart}`)
    .digest('hex');
}

function consumeLocal(subject: {
  scope: string;
  value: string;
  limit: number;
}): boolean {
  const now = Date.now();
  const key = `${subject.scope}:${subject.value}`;
  const current = localBuckets.get(key);
  if (!current || current.resetAt <= now) {
    if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
      for (const [bucket, value] of localBuckets) {
        if (value.resetAt <= now) localBuckets.delete(bucket);
      }
      if (localBuckets.size >= MAX_LOCAL_BUCKETS) {
        localBuckets.delete(localBuckets.keys().next().value ?? '');
      }
    }
    localBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= subject.limit;
}
