import 'server-only';

import { MongoClient, type Collection } from 'mongodb';

const COLLECTION_NAME = 'interest_signups';

type InterestSignupDocument = {
  email: string;
  source: string;
  createdAt: Date;
  lastSubmittedAt: Date;
  submissionCount: number;
};

type EarlyAccessMongoCache = {
  uri: string;
  database?: string;
  clientPromise: Promise<MongoClient>;
  collectionPromise?: Promise<Collection<InterestSignupDocument>>;
};

const mongoGlobal = globalThis as typeof globalThis & {
  __lessgoEarlyAccessMongo?: EarlyAccessMongoCache;
};

function getConfig(): { uri: string; database?: string } {
  return {
    uri: process.env.MONGODB_URL?.trim() ?? '',
    database: process.env.MONGODB_DB?.trim() || undefined,
  };
}

export function isEarlyAccessStorageConfigured(): boolean {
  return Boolean(getConfig().uri);
}

function getCache(): EarlyAccessMongoCache {
  const { uri, database } = getConfig();
  if (!uri) throw new Error('MONGODB_URL is not configured');

  const cached = mongoGlobal.__lessgoEarlyAccessMongo;
  if (cached?.uri === uri && cached.database === database) return cached;

  const client = new MongoClient(uri, {
    appName: 'lessgo-website-early-access',
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8_000,
  });
  const clientPromise = client.connect();
  const nextCache: EarlyAccessMongoCache = { uri, database, clientPromise };
  mongoGlobal.__lessgoEarlyAccessMongo = nextCache;

  void clientPromise.catch(() => {
    if (mongoGlobal.__lessgoEarlyAccessMongo === nextCache) {
      delete mongoGlobal.__lessgoEarlyAccessMongo;
    }
  });

  return nextCache;
}

async function getCollection(): Promise<Collection<InterestSignupDocument>> {
  const cache = getCache();
  if (!cache.collectionPromise) {
    const collectionPromise = cache.clientPromise.then(async (client) => {
      const collection = client
        .db(cache.database)
        .collection<InterestSignupDocument>(COLLECTION_NAME);
      await collection.createIndex({ email: 1 }, { name: 'email_unique', unique: true });
      return collection;
    });
    cache.collectionPromise = collectionPromise;

    void collectionPromise.catch(() => {
      if (cache.collectionPromise === collectionPromise) delete cache.collectionPromise;
    });
  }

  return cache.collectionPromise;
}

export async function saveInterestSignup(email: string, source: string): Promise<void> {
  const collection = await getCollection();
  const now = new Date();

  try {
    await collection.updateOne(
      { email },
      {
        $setOnInsert: { email, source, createdAt: now },
        $set: { lastSubmittedAt: now },
        $inc: { submissionCount: 1 },
      },
      { upsert: true },
    );
  } catch (error) {
    // Concurrent first submissions can race at the unique index. Count the
    // second submission against the row that won instead of failing the form.
    if ((error as { code?: number })?.code !== 11000) throw error;
    await collection.updateOne(
      { email },
      { $set: { lastSubmittedAt: now }, $inc: { submissionCount: 1 } },
    );
  }
}