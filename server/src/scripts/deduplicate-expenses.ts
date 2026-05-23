import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseModel from '../models/expense.model.js';

// Schema registration imports to avoid schema mapping errors
import '../models/client.model.js';
import '../models/expense-category.model.js';
import '../models/branch.model.js';
import '../models/staff.model.js';
import '../models/user.model.js';

dotenv.config();

async function deduplicate() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined.");
        process.exit(1);
    }

    const isDryRun = process.argv.includes('--execute') === false;

    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`🟢 Connected. Running in ${isDryRun ? 'DRY RUN' : 'EXECUTE'} mode.`);

    console.log(`🔍 Scanning for duplicate expenses...`);

    const duplicateGroups = await ExpenseModel.aggregate([
        {
            $group: {
                _id: {
                    title: "$title",
                    amount: "$amount",
                    date: "$date",
                    categoryId: "$categoryId",
                    branchId: "$branchId",
                    staffId: "$staffId",
                    status: "$status"
                },
                count: { $sum: 1 },
                ids: { $push: "$_id" }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`📊 Found ${duplicateGroups.length} groups of duplicate expenses.`);
    
    let totalDuplicatesCount = 0;
    const idsToDelete: mongoose.Types.ObjectId[] = [];

    duplicateGroups.forEach(group => {
        const deleteIds = group.ids.slice(1);
        totalDuplicatesCount += deleteIds.length;
        idsToDelete.push(...deleteIds);
    });

    console.log(`⚠️ Total duplicate records to be deleted: ${totalDuplicatesCount} (out of ${totalDuplicatesCount + duplicateGroups.length} records in these groups)`);

    if (totalDuplicatesCount === 0) {
        console.log("✅ No duplicate records found to delete!");
        await mongoose.disconnect();
        return;
    }

    // Let's print out the first 5 groups for inspection
    console.log("\n👀 Sample of duplicate groups (First 5):");
    for (let i = 0; i < Math.min(5, duplicateGroups.length); i++) {
        const group = duplicateGroups[i];
        console.log(`\nGroup ${i+1}:`);
        console.log(`- Title: "${group._id.title}"`);
        console.log(`- Amount: ${group._id.amount} BDT`);
        console.log(`- Date: ${new Date(group._id.date).toLocaleString()}`);
        console.log(`- Count: ${group.count}`);
        console.log(`- Keep ID: ${group.ids[0]}`);
        console.log(`- Delete IDs: ${group.ids.slice(1).join(', ')}`);
    }

    if (isDryRun) {
        console.log("\n💡 Dry run complete. No records were deleted.");
        console.log("💡 To execute the deduplication, run: npx tsx src/scripts/deduplicate-expenses.ts --execute");
    } else {
        console.log(`\n🔥 Executing deletion of ${idsToDelete.length} duplicate records...`);
        const deleteResult = await ExpenseModel.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`🎉 Successfully deleted ${deleteResult.deletedCount} duplicate expenses!`);
    }

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
}

deduplicate().catch(err => {
    console.error("❌ Error during deduplication:", err);
    process.exit(1);
});
