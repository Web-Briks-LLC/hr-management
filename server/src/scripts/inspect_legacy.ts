import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function inspect() {
    console.log('Starting inspection...');
    try {
        console.log('Connecting to Mongo...');
        const conn = await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const client = conn.connection.getClient();
        const dbName = 'hrManagement';
        const db = client.db(dbName);

        // List collections to ensure we have the right name
        const collections = await db.listCollections().toArray();
        console.log(
            'Collections in ' + dbName + ':',
            collections.map((c) => c.name),
        );

        const collection = db.collection('earningsList');

        const totalCount = await collection.countDocuments({});
        console.log('Total documents in collection:', totalCount);

        const sample = await collection.findOne({});
        console.log('Any Sample Document:', JSON.stringify(sample, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

inspect();
