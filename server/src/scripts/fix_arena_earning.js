import pkg from "mongoose";
const { connect, connection } = pkg;

/**
 * Fix ONLY the Arena Retouch Studio Feb 2026 earning.
 * - Recalculate totalAmount from actual 42 orders ($1,402.40)
 * - Remove the orphan orderId
 * - Recalculate BDT with rate 118
 */
async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB\n");
        const db = connection.db;
        const { ObjectId } = await import("mongodb");

        const earningId = "6986cb87a13088676e8048f8";
        const clientId = "6952ba2337bc6e4512a02604";

        // 1. Get the earning
        const earning = await db
            .collection("earnings")
            .findOne({ _id: new ObjectId(earningId) });
        if (!earning) {
            console.log("Earning not found!");
            process.exit(1);
        }

        console.log("=== BEFORE ===");
        console.log(`totalAmount: $${earning.totalAmount}`);
        console.log(`imageQty: ${earning.imageQty}`);
        console.log(`netAmount: $${earning.netAmount}`);
        console.log(`amountInBDT: ৳${earning.amountInBDT}`);
        console.log(`orderIds: ${earning.orderIds.length}`);

        // 2. Get all valid orders for this earning
        const orderObjectIds = earning.orderIds.map(
            (id) => new ObjectId(id.toString()),
        );
        const orders = await db
            .collection("orders")
            .find({
                _id: { $in: orderObjectIds },
                clientId: new ObjectId(clientId), // Only orders belonging to THIS client
            })
            .toArray();

        // 3. Calculate correct values
        let correctTotal = 0;
        let correctImageQty = 0;
        const validOrderIds = [];

        for (const order of orders) {
            correctTotal += order.totalPrice || 0;
            correctImageQty += order.imageQuantity || 0;
            validOrderIds.push(order._id);
        }
        correctTotal = Math.round(correctTotal * 100) / 100;

        const fees = earning.fees || 0;
        const tax = earning.tax || 0;
        const correctNetAmount =
            Math.round((correctTotal - fees - tax) * 100) / 100;
        const conversionRate = earning.conversionRate || 0;
        const correctBDT =
            Math.round(correctNetAmount * conversionRate * 100) / 100;

        console.log("\n=== AFTER (to be applied) ===");
        console.log(`totalAmount: $${correctTotal}`);
        console.log(`imageQty: ${correctImageQty}`);
        console.log(`netAmount: $${correctNetAmount}`);
        console.log(`amountInBDT: ৳${correctBDT} (rate: ${conversionRate})`);
        console.log(
            `orderIds: ${validOrderIds.length} (removed ${earning.orderIds.length - validOrderIds.length} orphan)`,
        );

        // 4. Apply fix
        await db.collection("earnings").updateOne(
            { _id: new ObjectId(earningId) },
            {
                $set: {
                    totalAmount: correctTotal,
                    imageQty: correctImageQty,
                    netAmount: correctNetAmount,
                    amountInBDT: correctBDT,
                    orderIds: validOrderIds,
                },
            },
        );

        console.log("\n✅ Fixed successfully!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
