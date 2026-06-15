import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';

dotenv.config();

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    try {
        // 1. Find all Salary and Overtime categories
        const categories = await ExpenseCategoryModel.find({
            name: { $in: [/^Salary/i, /^Overtime/i] }
        });

        const categoryIds = categories.map(c => c._id);
        console.log(`Found ${categoryIds.length} categories for Salary/Overtime.`);

        if (categoryIds.length === 0) {
            console.log("No salary/overtime categories found. Nothing to migrate.");
            return;
        }

        // 2. Find expenses belonging to these categories that don't have billingMonth set
        const expenses = await ExpenseModel.find({
            categoryId: { $in: categoryIds },
            billingMonth: { $exists: false }
        });

        console.log(`Found ${expenses.length} expenses to migrate.`);

        let successCount = 0;
        let errorCount = 0;

        for (const expense of expenses) {
            try {
                // Historically, date was set to the endDate of the payroll month.
                // So date.getMonth() and date.getFullYear() accurately represent the billing period.
                const billingMonth = expense.date.getMonth() + 1; // 1-indexed
                const billingYear = expense.date.getFullYear();

                expense.billingMonth = billingMonth;
                expense.billingYear = billingYear;
                
                // We keep the old date as it is. 
                // The transaction ledger will show these old ones on the last day of the month,
                // which is acceptable for historical data (they were recorded this way).
                // New records will have date = getBDNow().

                await expense.save();
                successCount++;
            } catch (err) {
                console.error(`Error migrating expense ${expense._id}:`, err);
                errorCount++;
            }
        }

        console.log(`\n🎉 Migration completed.`);
        console.log(`   - Successfully migrated: ${successCount}`);
        console.log(`   - Failed: ${errorCount}`);

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from database.");
    }
}

run().catch(console.error);
