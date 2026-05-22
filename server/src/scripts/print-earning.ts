import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EarningModel from '../models/earning.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    const earning = await EarningModel.findOne({}).lean();
    console.log("📄 Earning Document:");
    console.log(JSON.stringify(earning, null, 2));

    await mongoose.disconnect();
}

run().catch(console.error);
