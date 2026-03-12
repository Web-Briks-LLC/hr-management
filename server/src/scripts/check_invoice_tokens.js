import pkg from "mongoose";
const { connect, connection } = pkg;

async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB\n");
        const db = connection.db;

        // Try both string and number for Invoice 81
        const invoice81 = await db.collection("invoicerecords").findOne({
            $or: [{ invoiceNumber: 81 }, { invoiceNumber: "81" }],
        });

        if (!invoice81) {
            console.log(
                "Invoice 81 not found (checked as both number and string)",
            );
        } else {
            console.log("=== INVOICE 81 ===");
            console.log(`Client: ${invoice81.clientName}`);
            console.log(
                `Amount: ${invoice81.totalAmount} ${invoice81.currency}`,
            );
            console.log(`Status: ${invoice81.paymentStatus}`);
            console.log(`Payment Token stored: ${invoice81.paymentToken}`);
        }

        console.log("\n-------------------\n");

        // Try both string and number for Invoice 75
        const invoice75 = await db.collection("invoicerecords").findOne({
            $or: [{ invoiceNumber: 75 }, { invoiceNumber: "75" }],
        });

        if (!invoice75) {
            console.log(
                "Invoice 75 not found (checked as both number and string)",
            );
        } else {
            console.log("=== INVOICE 75 (Fuyad Test) ===");
            console.log(`Client: ${invoice75.clientName}`);
            console.log(
                `Amount: ${invoice75.totalAmount} ${invoice75.currency}`,
            );
            console.log(`Status: ${invoice75.paymentStatus}`);
            console.log(`Payment Token stored: ${invoice75.paymentToken}`);
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
