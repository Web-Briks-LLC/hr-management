import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';
import EarningModel from '../models/earning.model.js';
import DebitModel from '../models/Debit.js';
import ProfitDistributionModel from '../models/profit-distribution.model.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database. Starting Full System Migration to Cash Basis (createdAt)...");

    try {
        let totalUpdated = 0;

        // 1. Expenses (Includes Salary, Overtime, and all general expenses)
        console.log("Migrating Expenses...");
        const expenses = await ExpenseModel.find({});
        for (const ex of expenses) {
            if (ex.createdAt && new Date(ex.date).getTime() !== new Date(ex.createdAt as any).getTime()) {
                ex.date = ex.createdAt as any;
                await ex.save();
                totalUpdated++;
            }
        }
        console.log(`✅ Expenses migrated.`);

        // 2. Earnings
        console.log("Migrating Earnings...");
        const earnings = await EarningModel.find({});
        for (const er of earnings) {
            if (er.createdAt) {
                let changed = false;
                if (!er.paidAt || new Date(er.paidAt).getTime() !== new Date(er.createdAt as any).getTime()) {
                    er.paidAt = er.createdAt as any;
                    changed = true;
                }
                if (changed) {
                    await er.save();
                    totalUpdated++;
                }
            }
        }
        console.log(`✅ Earnings migrated.`);

        // 3. Debits (Borrow/Return)
        console.log("Migrating Debits...");
        const debits = await DebitModel.find({});
        for (const db of debits) {
            if (db.createdAt && new Date(db.date).getTime() !== new Date(db.createdAt as any).getTime()) {
                db.date = db.createdAt as any;
                await db.save();
                totalUpdated++;
            }
        }
        console.log(`✅ Debits migrated.`);

        // 4. Profit Distribution
        console.log("Migrating Profit Distributions...");
        const distributions = await ProfitDistributionModel.find({});
        for (const pd of distributions) {
            if (pd.createdAt && new Date(pd.distributedAt).getTime() !== new Date(pd.createdAt as any).getTime()) {
                pd.distributedAt = pd.createdAt as any;
                await pd.save();
                totalUpdated++;
            }
        }
        console.log(`✅ Profit Distributions migrated.`);

        // 5. Profit Transfer
        console.log("Migrating Profit Transfers...");
        const transfers = await ProfitTransferModel.find({});
        for (const pt of transfers) {
            if (pt.createdAt && new Date(pt.transferDate).getTime() !== new Date(pt.createdAt as any).getTime()) {
                pt.transferDate = pt.createdAt as any;
                await pt.save();
                totalUpdated++;
            }
        }
        console.log(`✅ Profit Transfers migrated.`);

        console.log(`\n🎉 Full System Migration completed.`);
        console.log(`   - Total transactions realigned to their exact creation time: ${totalUpdated}`);

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from database.");
    }
}

run().catch(console.error);
