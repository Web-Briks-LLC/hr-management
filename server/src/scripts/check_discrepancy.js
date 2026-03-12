import pkg from "mongoose";
const { connect, connection } = pkg;

async function main() {
    try {
        await connect(
            "mongodb://hrManagement:Oo0kwMllNlxfoDQb@hr-management-shard-00-00.ntt3g.mongodb.net:27017,hr-management-shard-00-01.ntt3g.mongodb.net:27017,hr-management-shard-00-02.ntt3g.mongodb.net:27017/hr-management?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=hr-management",
        );
        console.log("Connected to MongoDB");
        const db = connection.db;

        // 1. Find the client "Arena Retouch Studio"
        const clientDoc = await db
            .collection("clients")
            .findOne({ name: /arena retouch/i });
        if (!clientDoc) {
            console.log("Client not found");
            process.exit(0);
        }
        console.log("\n=== CLIENT ===");
        console.log(`Name: ${clientDoc.name}`);
        console.log(`ClientId: ${clientDoc.clientId}`);
        console.log(`_id: ${clientDoc._id}`);
        console.log(`Currency: ${clientDoc.currency}`);

        // 2. Find the earning for Feb 2026
        const earning = await db.collection("earnings").findOne({
            clientId: clientDoc._id,
            month: 2,
            year: 2026,
        });
        console.log("\n=== EARNING (Feb 2026) ===");
        if (earning) {
            console.log(`_id: ${earning._id}`);
            console.log(`totalAmount: $${earning.totalAmount}`);
            console.log(`currency: ${earning.currency}`);
            console.log(`imageQty: ${earning.imageQty}`);
            console.log(`netAmount: $${earning.netAmount}`);
            console.log(`amountInBDT: ${earning.amountInBDT}`);
            console.log(`conversionRate: ${earning.conversionRate}`);
            console.log(`status: ${earning.status}`);
            console.log(`orderIds count: ${earning.orderIds?.length || 0}`);
            console.log(`notes: ${earning.notes}`);
        } else {
            console.log("No earning found");
        }

        // 3. Find invoices for this client
        const invoices = await db
            .collection("invoicerecords")
            .find({
                clientId: clientDoc.clientId,
                month: 2,
                year: 2026,
            })
            .toArray();
        console.log(`\n=== INVOICES (Feb 2026) === (${invoices.length} found)`);
        for (const inv of invoices) {
            console.log(
                `  Invoice #${inv.invoiceNumber}: $${inv.totalAmount} ${inv.currency} | Status: ${inv.paymentStatus} | Images: ${inv.totalImages} | Orders: ${inv.totalOrders}`,
            );
        }

        // 4. Get all orders for this client in Feb 2026
        const startOfFeb = new Date("2026-02-01T00:00:00.000Z");
        const endOfFeb = new Date("2026-02-28T23:59:59.999Z");
        const orders = await db
            .collection("orders")
            .find({
                clientId: clientDoc._id,
                orderDate: { $gte: startOfFeb, $lte: endOfFeb },
            })
            .sort({ orderDate: 1 })
            .toArray();

        console.log(`\n=== ORDERS (Feb 2026) === (${orders.length} orders)`);
        let totalFromOrders = 0;
        let totalImages = 0;
        for (const o of orders) {
            const price = o.totalPrice || 0;
            const imgs = o.quantity || 0;
            totalFromOrders += price;
            totalImages += imgs;
            console.log(
                `  ${(o.orderName || "").padEnd(45)} | ${o.orderDate?.toISOString().slice(0, 10)} | Qty: ${String(imgs).padStart(4)} | $${price.toFixed(2).padStart(8)} | ${o.status}`,
            );
        }
        console.log(`\n--- TOTALS ---`);
        console.log(
            `Sum of all ${orders.length} order prices: $${totalFromOrders.toFixed(2)}`,
        );
        console.log(`Total images from orders: ${totalImages}`);
        if (earning) {
            console.log(`Earning totalAmount:        $${earning.totalAmount}`);
            console.log(
                `Difference (orders - earning): $${(totalFromOrders - earning.totalAmount).toFixed(2)}`,
            );
        }
        if (invoices.length > 0) {
            const invTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
            console.log(`Invoice(s) totalAmount:     $${invTotal.toFixed(2)}`);
            console.log(
                `Difference (orders - invoice): $${(totalFromOrders - invTotal).toFixed(2)}`,
            );
        }

        // 5. Check if earning orderIds match actual orders
        if (earning && earning.orderIds) {
            const { ObjectId } = await import("mongodb");
            const earningOrderIds = earning.orderIds.map((id) => id.toString());
            const actualOrderIds = orders.map((o) => o._id.toString());
            const inEarningNotInOrders = earningOrderIds.filter(
                (id) => !actualOrderIds.includes(id),
            );
            const inOrdersNotInEarning = actualOrderIds.filter(
                (id) => !earningOrderIds.includes(id),
            );
            console.log(`\n--- ORDER ID COMPARISON ---`);
            console.log(`OrderIds in earning: ${earningOrderIds.length}`);
            console.log(`Actual Feb orders:   ${actualOrderIds.length}`);
            if (inEarningNotInOrders.length > 0) {
                console.log(
                    `\nIn earning but NOT in Feb orders: ${inEarningNotInOrders.length}`,
                );
                for (const id of inEarningNotInOrders) {
                    try {
                        const orphan = await db
                            .collection("orders")
                            .findOne({ _id: new ObjectId(id) });
                        if (orphan) {
                            console.log(
                                `  -> ${orphan.orderName} | Date: ${orphan.orderDate?.toISOString().slice(0, 10)} | Price: $${orphan.totalPrice} | Status: ${orphan.status}`,
                            );
                        } else {
                            console.log(`  -> DELETED order: ${id}`);
                        }
                    } catch (e) {
                        console.log(`  -> Invalid ID: ${id}`);
                    }
                }
            }
            if (inOrdersNotInEarning.length > 0) {
                console.log(
                    `\nIn Feb orders but NOT in earning: ${inOrdersNotInEarning.length}`,
                );
                for (const id of inOrdersNotInEarning) {
                    const missing = orders.find((o) => o._id.toString() === id);
                    if (missing) {
                        console.log(
                            `  -> ${missing.orderName} | Price: $${missing.totalPrice}`,
                        );
                    }
                }
            }
            if (
                inEarningNotInOrders.length === 0 &&
                inOrdersNotInEarning.length === 0
            ) {
                console.log("All order IDs match perfectly!");
            }
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        process.exit(0);
    }
}

main();
