import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkDuplication() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        // Target: WB_1001_31
        const targetClientId = '6952ba2237bc6e4512a02602'; // From previous output

        console.log(
            `Checking Earnings for Client ${targetClientId} (Sep-Oct 2025)...`,
        );

        const earnings = await db
            .collection('earnings')
            .find({
                clientId: new mongoose.Types.ObjectId(targetClientId), // Ensure ObjectId match
                year: 2025,
                month: { $in: [9, 10] },
            })
            .toArray();

        console.log(`Found ${earnings.length} earning documents.`);

        const allOrderIds = [];
        const seenOrderIds = new Set();
        let duplicateCount = 0;
        let totalAmountSum = 0;

        earnings.forEach((e) => {
            console.log(
                `- Earning ID: ${e._id}, Month: ${e.month}, Amount: ${e.totalAmount}, Orders: ${e.orderIds?.length || 0}`,
            );
            totalAmountSum += e.totalAmount || 0;

            if (e.orderIds && Array.isArray(e.orderIds)) {
                e.orderIds.forEach((oid) => {
                    const oidStr = oid.toString();
                    allOrderIds.push(oidStr);
                    if (seenOrderIds.has(oidStr)) {
                        duplicateCount++;
                    } else {
                        seenOrderIds.add(oidStr);
                    }
                });
            }
        });

        console.log('--- Summary ---');
        console.log(`Total Earning Amount: ${totalAmountSum}`);
        console.log(`Total unique orders referenced: ${seenOrderIds.size}`);
        console.log(`Duplicate order references found: ${duplicateCount}`);

        if (duplicateCount > 0) {
            console.log(
                'ALERT: Orders are being counted multiple times across earning documents!',
            );
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkDuplication();
