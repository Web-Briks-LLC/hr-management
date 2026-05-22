import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    const collections = await mongoose.connection.db!.listCollections().toArray();
    console.log("📁 Database Collections:");
    collections.forEach(c => console.log(`   - ${c.name}`));

    // Let's print document count for each collection
    console.log("\n📊 Document Counts:");
    for (const c of collections) {
        const count = await mongoose.connection.db!.collection(c.name).countDocuments();
        console.log(`   - ${c.name}: ${count} documents`);
    }

    await mongoose.disconnect();
}

run().catch(console.error);
