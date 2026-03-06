import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI =
    process.env.MONGO_URI || 'mongodb://localhost:27017/hr-management';

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(
            'Connected to MongoDB at',
            MONGODB_URI.substring(0, 20) + '...',
        );

        if (!mongoose.connection.db) {
            throw new Error('Failed to connect to MongoDB');
        }

        const db = mongoose.connection.db;
        const clientsCollection = db.collection('clients');

        // Drop the old email_1 index if it exists, to avoid duplicate key errors on null
        try {
            await clientsCollection.dropIndex('email_1');
            console.log('Dropped legacy email_1 index.');
        } catch (e: any) {
            console.log(
                'Index email_1 not found or already dropped.',
                e.message,
            );
        }

        // Find all clients that still have the old 'email' field and don't have 'emails'
        const legacyClients = await clientsCollection
            .find({
                email: { $exists: true },
                emails: { $exists: false },
            })
            .toArray();

        console.log(`Found ${legacyClients.length} clients to migrate.`);

        for (const client of legacyClients) {
            await clientsCollection.updateOne(
                { _id: client._id },
                {
                    $set: { emails: [client.email.toLowerCase()] },
                    $unset: { email: '' },
                },
            );
            console.log(`Migrated client: ${client.name} (${client.email})`);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
