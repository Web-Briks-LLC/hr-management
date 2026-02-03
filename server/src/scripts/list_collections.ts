import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const uri = process.env.MONGO_URI;

if (!uri) {
    console.error('MONGO_URI is undefined');
    process.exit(1);
}

async function listCollections() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');
        const collections = await db.listCollections().toArray();
        console.log('Collections in database:');
        collections.forEach((c) => console.log(`- ${c.name}`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listCollections();
