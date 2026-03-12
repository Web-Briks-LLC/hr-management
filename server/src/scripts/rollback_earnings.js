import pkg from "mongoose";
const { connect, connection } = pkg;

/**
 * Rollback script: Restores earnings to their pre-fix values.
 * Generated from the fix_earnings.js output.
 */
const rollbackData = [
    { _id: "69808499fb6fd56b487036bf", imageQty: 1, amountInBDT: 531 },
    { _id: "69808499fb6fd56b487036eb", imageQty: 4 },
    { _id: "69808499fb6fd56b487036ec", imageQty: 2 },
    { _id: "69808499fb6fd56b487036bb", imageQty: 47 },
    { _id: "69808499fb6fd56b487036c3", imageQty: 3, amountInBDT: 4395.5 },
    { _id: "69808499fb6fd56b487036e8", imageQty: 19 },
    { _id: "69808499fb6fd56b487036e7", imageQty: 48 },
    { _id: "69808499fb6fd56b487036c1", imageQty: 2, amountInBDT: 2478 },
    { _id: "69808499fb6fd56b487036e5", imageQty: 61 },
    { _id: "69808499fb6fd56b487036ee", imageQty: 1 },
    { _id: "69808499fb6fd56b487036c2", imageQty: 2, amountInBDT: 708 },
    { _id: "69808499fb6fd56b487036c8", imageQty: 13, amountInBDT: 68889.6 },
    { _id: "69808499fb6fd56b487036e6", imageQty: 72 },
    { _id: "69808499fb6fd56b487036bd", imageQty: 59, amountInBDT: 283174.04 },
    { _id: "69808499fb6fd56b487036be", imageQty: 5, amountInBDT: 21594 },
    { _id: "69808499fb6fd56b487036c0", imageQty: 1, amountInBDT: 2532.28 },
    { _id: "69808499fb6fd56b487036e9", imageQty: 11 },
    { _id: "69808499fb6fd56b487036bc", imageQty: 30 },
    { _id: "69808499fb6fd56b487036ea", imageQty: 2 },
    { _id: "69808499fb6fd56b487036ed", imageQty: 1 },
    { _id: "6980e814a83104f25fa0cdc0", imageQty: 1 },
    {
        _id: "6985774f03425e4bb4aff0a2",
        totalAmount: 4090,
        netAmount: 4090,
        amountInBDT: 0,
    },
    {
        _id: "6986ca19a13088676e804853",
        totalAmount: 1347.4,
        netAmount: 1347.4,
        imageQty: 8210,
        amountInBDT: 0,
    },
    {
        _id: "6986cb87a13088676e8048f8",
        totalAmount: 1242.17,
        netAmount: 1242.17,
        amountInBDT: 146576.06,
    },
    {
        _id: "6986cd89a13088676e8049ed",
        totalAmount: 6111.25,
        netAmount: 6111.25,
        imageQty: 11134,
        amountInBDT: 721127.5,
    },
    {
        _id: "6986d820a13088676e804f23",
        totalAmount: 489,
        netAmount: 489,
        imageQty: 815,
    },
    {
        _id: "6986df74a13088676e8053af",
        totalAmount: 214,
        netAmount: 214,
        imageQty: 109,
        amountInBDT: 0,
    },
    {
        _id: "6986e0a7a13088676e80544d",
        totalAmount: 26.9,
        netAmount: 26.9,
        imageQty: 32,
        amountInBDT: 0,
    },
    {
        _id: "6986e501a13088676e8056f7",
        totalAmount: 93.5,
        netAmount: 93.5,
        imageQty: 187,
        amountInBDT: 0,
    },
];

async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB\n");
        const db = connection.db;
        const { ObjectId } = await import("mongodb");

        let restoredCount = 0;

        for (const item of rollbackData) {
            const setFields = {};
            if (item.totalAmount !== undefined)
                setFields.totalAmount = item.totalAmount;
            if (item.netAmount !== undefined)
                setFields.netAmount = item.netAmount;
            if (item.imageQty !== undefined) setFields.imageQty = item.imageQty;
            if (item.amountInBDT !== undefined)
                setFields.amountInBDT = item.amountInBDT;

            await db
                .collection("earnings")
                .updateOne(
                    { _id: new ObjectId(item._id) },
                    { $set: setFields },
                );
            console.log(`Restored ${item._id}`);
            restoredCount++;
        }

        console.log(
            `\nDone! Restored ${restoredCount} earnings to original values.`,
        );
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
