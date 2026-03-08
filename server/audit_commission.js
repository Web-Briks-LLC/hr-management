import { MongoClient, ObjectId } from 'mongodb';

async function audit() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('hr-management');
        
        const earnings = db.collection('earnings');
        const transactions = db.collection('wallettransactions');
        const staffs = db.collection('staffs');
        
        // Find earning for Doland Trump March 2026
        const earning = await earnings.findOne({ month: 3, year: 2026 });
        if (!earning) {
            console.log("Earning not found");
            return;
        }
        
        console.log(`Earning: ${earning._id}, Total: ${earning.totalAmount}, Paid: ${earning.paidAmount}, BDT: ${earning.amountInBDT}`);
        
        const earningId = earning._id;
        
        const txs = await transactions.find({
            'metadata.earningId': earningId,
            type: 'commission',
            status: 'completed'
        }).toArray();
        
        console.log("Transactions (as ObjectId in query):");
        let total = 0;
        txs.forEach(t => {
            console.log(`- ${t.description}: +৳${t.amount} (ID: ${t._id})`);
            total += t.amount;
        });

        const txsStr = await transactions.find({
            'metadata.earningId': earningId.toString(),
            type: 'commission',
            status: 'completed'
        }).toArray();
        
        console.log("Transactions (as String in query):");
        txsStr.forEach(t => {
            console.log(`- ${t.description}: +৳${t.amount} (ID: ${t._id})`);
            total += t.amount;
        });

        console.log(`Total Commission found for this earning: ৳${total}`);
        
        const staff = await staffs.findOne({ userId: earning.clientId.createdBy || earning.createdBy });
        if (staff) {
            console.log(`Staff ${staff.staffId} Balance: ৳${staff.balance}`);
        } else {
            console.log("Staff not found for this earning's creator/client creator");
        }
    } finally {
        await client.close();
    }
}

audit().catch(console.error);
