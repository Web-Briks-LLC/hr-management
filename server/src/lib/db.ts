import { MongoClient } from 'mongodb';
import envConfig from '../config/env.config.js';

let cachedClient: MongoClient | null = null;
let cachedPromise: Promise<MongoClient> | null = null;

export async function client(): Promise<MongoClient> {
    if (cachedClient) return cachedClient;

    if (!cachedPromise) {
        cachedPromise = new MongoClient(envConfig.mongo_uri).connect();
    }

    cachedClient = await cachedPromise;
    console.log('🟢 MongoDB Client Connected');

    return cachedClient;
}
