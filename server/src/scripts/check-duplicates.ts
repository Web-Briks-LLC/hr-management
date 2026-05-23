import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';

dotenv.config();

async function checkDuplicates() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    // Let's find expenses with title containing "Asad" on "2025-01-30"
    const start = new Date("2025-01-30T00:00:00.000Z");
    const end = new Date("2025-01-31T00:00:00.000Z");

    const expenses = await ExpenseModel.find({
        date: { $gte: start, $lte: end }
    }).lean();

    console.log(`\nFound ${expenses.length} expenses on Jan 30, 2025:`);
    expenses.forEach(ex => {
        console.log(`- ID: ${ex._id}, Title: "${ex.title}", Amount: ${ex.amount}, Date: ${ex.date.toISOString()}, Status: ${ex.status}`);
    });

    await mongoose.disconnect();
}

checkDuplicates().catch(console.error);
