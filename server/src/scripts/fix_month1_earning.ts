import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function fixMonth1() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Fixing Month 1 Legacy Earning...');

        const targetTotalBDT = 1989874.395;
        const conversionRate = 120.998;
        const totalAmount = targetTotalBDT / conversionRate;

        // Delete existing Month 1 Legacy doc(s)
        await db.collection('earnings').deleteMany({
            year: 2025,
            month: 1,
            isLegacy: true,
        });

        // Insert Correct One
        const doc = {
            clientId: new mongoose.Types.ObjectId('6952ba2237bc6e4512a02602'),
            year: 2025,
            month: 1,
            amountInBDT: targetTotalBDT,
            totalAmount: totalAmount,
            netAmount: totalAmount,
            conversionRate: conversionRate,
            currency: 'USD',
            status: 'paid',
            isLegacy: true,
            isFixed: false,
            orderIds: [],
            legacyClientCode: 'WB_1001_31',
            createdAt: new Date(),
            updatedAt: new Date(),
            imageQty: 0,
            notes: `Restored legacy data (Manual Fix for Month 1)`,
        };

        await db.collection('earnings').insertOne(doc);
        console.log(`Month 1: Fixed Doc (Total BDT: ${targetTotalBDT})`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

fixMonth1();
