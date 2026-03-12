import pkg from "mongoose";
const { connect, connection } = pkg;

async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB\n");
        const db = connection.db;

        const invoicesToRevert = [81, 75]; // Number
        const invoicesToRevertStr = ["81", "75"]; // String

        for (const invNum of [...invoicesToRevert, ...invoicesToRevertStr]) {
            const invoice = await db.collection("invoicerecords").findOne({
                invoiceNumber: invNum,
            });

            if (!invoice) continue;

            console.log(
                `=== Reverting Invoice ${invNum} (${invoice.clientName}) ===`,
            );

            // 1. Revert Invoice Record
            await db.collection("invoicerecords").updateOne(
                { _id: invoice._id },
                {
                    $set: { paymentStatus: "pending" },
                    $unset: { paymentToken: "", pendingPaymentIntentId: "" },
                },
            );
            console.log("  - Marked invoice as pending");

            // 2. Revert Earning Record (if month/year exists)
            if (invoice.clientId && invoice.month && invoice.year) {
                const earning = await db.collection("earnings").findOne({
                    clientId: invoice.clientId,
                    month: invoice.month,
                    year: invoice.year,
                });

                if (earning) {
                    await db.collection("earnings").updateOne(
                        { _id: earning._id },
                        {
                            $set: {
                                status: "unpaid",
                                amountInBDT: 0,
                                conversionRate: 0,
                            },
                            $unset: { paidAt: "", notes: "" },
                        },
                    );
                    console.log(
                        `  - Reverted Earning ${earning._id} to unpaid`,
                    );
                } else {
                    console.log(
                        `  - No related earning found for month ${invoice.month}/${invoice.year}`,
                    );
                }
            }
            console.log("");
        }

        console.log("Done.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
