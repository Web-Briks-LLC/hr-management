import pkg from "mongoose";
const { connect, connection } = pkg;

/**
 * Recalculate all earnings' totalAmount from their actual orderIds.
 * Also fixes: imageQty, netAmount, and removes orphan orderIds.
 */
async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB\n");
        const db = connection.db;

        const { ObjectId } = await import("mongodb");

        // Get ALL earnings
        const earnings = await db.collection("earnings").find({}).toArray();
        console.log(`Found ${earnings.length} earning records to check\n`);

        let fixedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const earning of earnings) {
            try {
                if (!earning.orderIds || earning.orderIds.length === 0) {
                    // Legacy earning with no order refs — skip
                    skippedCount++;
                    continue;
                }

                // Fetch all orders referenced by this earning
                const orderObjectIds = earning.orderIds.map(
                    (id) => new ObjectId(id.toString()),
                );
                const orders = await db
                    .collection("orders")
                    .find({ _id: { $in: orderObjectIds } })
                    .toArray();

                // Calculate correct totals from actual orders
                let correctTotal = 0;
                let correctImageQty = 0;
                const validOrderIds = [];

                for (const order of orders) {
                    correctTotal += order.totalPrice || 0;
                    correctImageQty +=
                        order.imageQuantity || order.quantity || 0;
                    validOrderIds.push(order._id);
                }

                // Round to 2 decimal places to avoid floating point drift
                correctTotal = Math.round(correctTotal * 100) / 100;

                const currentTotal =
                    Math.round((earning.totalAmount || 0) * 100) / 100;
                const currentImageQty = earning.imageQty || 0;
                const orphanCount =
                    earning.orderIds.length - validOrderIds.length;

                // Check if anything needs updating
                if (
                    currentTotal === correctTotal &&
                    currentImageQty === correctImageQty &&
                    orphanCount === 0
                ) {
                    skippedCount++;
                    continue;
                }

                // Calculate new netAmount (totalAmount - fees - tax)
                const fees = earning.fees || 0;
                const tax = earning.tax || 0;
                const correctNetAmount =
                    Math.round((correctTotal - fees - tax) * 100) / 100;

                // Recalculate BDT if conversionRate is set
                const conversionRate = earning.conversionRate || 0;
                const correctBDT =
                    conversionRate > 0
                        ? Math.round(correctNetAmount * conversionRate * 100) /
                          100
                        : earning.amountInBDT || 0;

                console.log(
                    `--- Earning ${earning._id} (${earning.month}/${earning.year}) ---`,
                );
                if (currentTotal !== correctTotal) {
                    console.log(
                        `  totalAmount: $${currentTotal} → $${correctTotal} (diff: $${(correctTotal - currentTotal).toFixed(2)})`,
                    );
                }
                if (currentImageQty !== correctImageQty) {
                    console.log(
                        `  imageQty: ${currentImageQty} → ${correctImageQty}`,
                    );
                }
                if (orphanCount > 0) {
                    console.log(`  Removing ${orphanCount} orphan orderIds`);
                }
                if (earning.amountInBDT !== correctBDT) {
                    console.log(
                        `  amountInBDT: ৳${earning.amountInBDT || 0} → ৳${correctBDT} (rate: ${conversionRate})`,
                    );
                }

                // Apply the fix
                await db.collection("earnings").updateOne(
                    { _id: earning._id },
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

                fixedCount++;
            } catch (err) {
                console.error(
                    `  ERROR on earning ${earning._id}: ${err.message}`,
                );
                errorCount++;
            }
        }

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total earnings:  ${earnings.length}`);
        console.log(`Fixed:           ${fixedCount}`);
        console.log(`Already correct: ${skippedCount}`);
        console.log(`Errors:          ${errorCount}`);
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
