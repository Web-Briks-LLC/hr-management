import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function checkValues() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        // Target: WB_1001_31, Earning ID: 69808499fb6fd56b487036ce (Month 9)
        // From previous output: Amount: 14266.95, Orders: 73
        const targetEarningId = '69808499fb6fd56b487036ce';

        console.log(`Inspecting Earning Doc: ${targetEarningId}`);
        const earning = await db.collection('earnings').findOne({
            _id: new mongoose.Types.ObjectId(targetEarningId),
        });

        if (!earning) {
            console.log('Earning doc not found');
            return;
        }

        console.log(`Earning Stated Total: ${earning.totalAmount}`);
        console.log(`Order Count: ${earning.orderIds.length}`);

        const orderIds = earning.orderIds.map(
            (oid: any) => new mongoose.Types.ObjectId(oid),
        );
        const orders = await db
            .collection('orders')
            .find({
                _id: { $in: orderIds },
            })
            .toArray();

        console.log(`Found ${orders.length} referenced orders.`);

        let calculatedSum = 0;
        orders.forEach((o) => {
            calculatedSum += o.totalPrice || 0;
        });

        console.log(`Sum of Orders' TotalPrice: ${calculatedSum.toFixed(2)}`);
        console.log(
            `Difference: ${(earning.totalAmount - calculatedSum).toFixed(2)}`,
        );

        if (Math.abs(earning.totalAmount - calculatedSum) > 1) {
            console.log(
                'MISMATCH CONFIRMED: Earning doc total does not match sum of its orders.',
            );
        } else {
            console.log('MATCH: Earning doc total consistent with orders.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
checkValues();
