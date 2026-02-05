import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import EarningModel from '../models/earning.model.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
}

const uri = process.env.MONGO_URI;

async function checkFebEarnings() {
    if (!uri) {
        console.error('MONGO_URI is not defined');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const year = 2025;
        const month = 2; // February

        const earnings = await EarningModel.find({ year, month }).populate(
            'clientId',
        );

        console.log(`Found ${earnings.length} earnings for Feb 2025`);

        console.log('--- Earnings List ---');
        earnings.forEach((e: any) => {
            const clientName = e.clientId?.name || 'Unknown';
            const legacyCode = e.legacyClientCode || 'N/A';
            console.log(
                `ID: ${e._id} | Client: ${clientName} (${legacyCode}) | Amount: $${e.totalAmount} | BDT: ${e.amountInBDT} | Status: ${e.status}`,
            );
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkFebEarnings();
