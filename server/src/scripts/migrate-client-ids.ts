import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { ClientModel } from '../models/client.model.js';

async function migrateClientIds() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/dev-hr-management';
        console.log('Connecting to MongoDB...', mongoUri);
        await mongoose.connect(mongoUri);

        const clients = await ClientModel.find().sort({ createdAt: 1 });
        console.log(`Found ${clients.length} clients to migrate.`);

        let currentNum = 10001;
        for (const client of clients) {
            const newClientId = `WB-${currentNum}`;
            const oldClientId = client.clientId || 'unassigned';

            await ClientModel.updateOne(
                { _id: client._id },
                { $set: { clientId: newClientId } }
            );

            console.log(`Updated client "${client.name}": ${oldClientId} -> ${newClientId}`);
            currentNum++;
        }

        console.log(`Successfully migrated ${clients.length} clients to WB-10001 series!`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateClientIds();
