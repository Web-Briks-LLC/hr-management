import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/client.model.js';
import '../models/expense-category.model.js';
import '../models/Person.js';
import '../models/shareholder.model.js';
import '../models/external-business.model.js';
import transactionService from '../services/transaction.service.js';
import analyticsService from '../services/analytics.service.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("MONGO_URI is missing.");
        process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    const ledgerRes = await transactionService.getUnifiedTransactions({});
    console.log("\n📊 Unified Ledger Summary:");
    console.log(JSON.stringify(ledgerRes.summary, null, 2));

    const finalAmount = await analyticsService.getCurrentFinalAmount();
    console.log(`\n💎 Analytics getCurrentFinalAmount: ${finalAmount}`);

    const difference = Math.abs(ledgerRes.summary.closingBalance - finalAmount);
    console.log(`⚖️ Difference: ${difference}`);

    await mongoose.disconnect();
}

run().catch(console.error);
