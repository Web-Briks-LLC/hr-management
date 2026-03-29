import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI;

async function analyzeEarnings() {
    if (!uri) {
        console.error('OFFICE_MONGO_URI not found in .env file');
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(); // Uses the database from the URI
        const earningsCollection = db.collection('earnings');

        const pipeline = [
            {
                $group: {
                    _id: '$currency',
                    totalAmount: { $sum: '$totalAmount' },
                    paidAmount: { $sum: '$paidAmount' },
                    unpaidAmount: { 
                        $sum: { $subtract: ['$totalAmount', '$paidAmount'] } 
                    },
                    paidAmountBDT: { $sum: '$paidAmountBDT' }
                }
            }
        ];

        const results = await earningsCollection.aggregate(pipeline).toArray();

        console.log('\n--- Earnings Analysis ---');
        
        let totalPaidBDTAll = 0;

        results.forEach(res => {
            const currency = res._id || 'UNKNOWN';
            console.log(`\nCurrency: ${currency}`);
            console.log(`  Total:  ${res.totalAmount.toFixed(2)}`);
            console.log(`  Paid:   ${res.paidAmount.toFixed(2)}`);
            console.log(`  Unpaid: ${res.unpaidAmount.toFixed(2)}`);
            console.log(`  Paid (BDT): ${res.paidAmountBDT.toFixed(2)}`);
            
            totalPaidBDTAll += res.paidAmountBDT;
        });

        console.log('\n-------------------------');
        console.log(`GRAND TOTAL PAID (BDT): ${totalPaidBDTAll.toFixed(2)}`);
        console.log('-------------------------\n');

    } catch (err) {
        console.error('Error during analysis:', err);
    } finally {
        await client.close();
    }
}

analyzeEarnings();
