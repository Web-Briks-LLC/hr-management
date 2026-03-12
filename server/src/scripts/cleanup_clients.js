import pkg from "mongoose";
const { connect, connection } = pkg;

async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB\n");
        const db = connection.db;

        // --- 1. Fix Keller James (Invoice 81) Earning ---
        const invoice81 = await db.collection("invoicerecords").findOne({
            $or: [{ invoiceNumber: 81 }, { invoiceNumber: "81" }],
        });

        if (invoice81) {
            console.log(`=== Keller James (Invoice 81) ===`);
            console.log(`Current Invoice Status: ${invoice81.paymentStatus}`);

            const earning = await db.collection("earnings").findOne({
                clientId: invoice81.clientId,
                month: Number(invoice81.month),
                year: Number(invoice81.year),
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
                console.log(`Reverted Earning ${earning._id} to unpaid`);
            } else {
                console.log(
                    `No earning found for Keller James in ${invoice81.month}/${invoice81.year}`,
                );
            }
            console.log("------------------------");
        }

        // --- 2. Delete Fuyad Test Client (Invoice 75) ---
        console.log(`=== Deleting Fuyad Test Client ===`);
        const fuyadClient = await db.collection("clients").findOne({
            name: { $regex: /Fuyad Test/i },
        });

        if (fuyadClient) {
            const clientIdStr = fuyadClient.clientId; // String ID like 'WB_1002_xx'
            const clientObjId = fuyadClient._id;

            // Delete Orders
            const d1 = await db
                .collection("orders")
                .deleteMany({ clientId: clientObjId });
            console.log(`Deleted ${d1.deletedCount} orders`);

            // Delete Invoices
            const d2 = await db
                .collection("invoicerecords")
                .deleteMany({ clientId: clientObjId });
            console.log(`Deleted ${d2.deletedCount} invoices`);

            // Delete Earnings
            const d3 = await db
                .collection("earnings")
                .deleteMany({ clientId: clientObjId });
            console.log(`Deleted ${d3.deletedCount} earnings`);

            // Delete Client
            await db.collection("clients").deleteOne({ _id: clientObjId });
            console.log(`Deleted Client '${fuyadClient.name}'`);
        } else {
            console.log("Fuyad Test Client not found.");
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
