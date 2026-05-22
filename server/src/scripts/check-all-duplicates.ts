import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';

dotenv.config();

async function checkAllDuplicates() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database.");

    // Aggregate by title, amount, and date to find duplicate expenses
    const duplicates = await ExpenseModel.aggregate([
        {
            $group: {
                _id: {
                    title: "$title",
                    amount: "$amount",
                    date: "$date"
                },
                count: { $sum: 1 },
                ids: { $push: "$_id" }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    console.log(`📊 Found ${duplicates.length} unique expense groups that have duplicates.`);
    
    let totalDuplicateCount = 0;
    duplicates.forEach(d => {
        totalDuplicateCount += (d.count - 1);
    });
    
    console.log(`⚠️ Total extra duplicate documents in ExpenseModel: ${totalDuplicateCount}`);
    
    if (duplicates.length > 0) {
        console.log(`\nTop 10 duplicate expense groups:`);
        duplicates.slice(0, 10).forEach(d => {
            console.log(`- Title: "${d._id.title}", Amount: ${d._id.amount}, Date: ${d._id.date ? d._id.date.toISOString() : 'N/A'}, Count: ${d.count}`);
        });
    }

    // Let's also check if Earnings have duplicates!
    const earningDuplicates = await mongoose.connection.collection("earnings").aggregate([
        {
            $group: {
                _id: {
                    clientId: "$clientId",
                    month: "$month",
                    year: "$year"
                },
                count: { $sum: 1 }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]).toArray();

    console.log(`\n📊 Found ${earningDuplicates.length} duplicated earnings.`);

    await mongoose.disconnect();
}

checkAllDuplicates().catch(console.error);
