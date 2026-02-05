import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function investigate() {
    try {
        await mongoose.connect(MONGO_URI);
        const client = mongoose.connection.getClient();

        const sourceDb = client.db('hrManagement');
        const sourceColl = sourceDb.collection('earningsList');

        const targetDb = mongoose.connection.db;
        if (!targetDb) throw new Error('Target DB not found');
        const targetColl = targetDb.collection('earnings');

        // Check Sep/Oct in Source
        // Sep = 9, Oct = 10
        // Legacy Month names: September, October

        const legacyDocs = await sourceColl
            .find({
                month: {
                    $in: ['September', 'October', 'september', 'october'],
                },
                date: { $regex: /2025/ },
            })
            .toArray();

        console.log(`Found ${legacyDocs.length} legacy docs for Sep/Oct 2025`);

        let legacySepTotalBDT = 0;
        let legacySepTotalUSD = 0;
        let legacyOctTotalBDT = 0;
        let legacyOctTotalUSD = 0;

        // Check for other fields like totalEur
        let eurFound = false;

        for (const doc of legacyDocs) {
            const m = (doc.month as string).toLowerCase().trim();
            const bdt = doc.convertedBdt || 0;
            const usd = doc.totalUsd || 0;
            const eur = doc.totalEur || doc.totalEuro || 0; // Guessing field names

            if (eur > 0 || doc.totalEur !== undefined) {
                if (!eurFound) {
                    console.log('Found EUR field in doc:', doc._id, doc);
                    eurFound = true;
                }
            }

            if (m === 'september') {
                legacySepTotalBDT += bdt;
                legacySepTotalUSD += usd;
            } else if (m === 'october') {
                legacyOctTotalBDT += bdt;
                legacyOctTotalUSD += usd;
            }
        }

        console.log('--- Source (Legacy) Totals ---');
        console.log(
            'Sep BDT:',
            legacySepTotalBDT.toLocaleString(),
            'USD:',
            legacySepTotalUSD.toLocaleString(),
        );
        console.log(
            'Oct BDT:',
            legacyOctTotalBDT.toLocaleString(),
            'USD:',
            legacyOctTotalUSD.toLocaleString(),
        );

        // Check Target
        const targetDocs = await targetColl
            .find({
                month: { $in: [9, 10] },
                year: 2025,
                isLegacy: true,
            })
            .toArray();

        let sepTotalBDT = 0;
        let sepTotalAmount = 0;
        let octTotalBDT = 0;
        let octTotalAmount = 0;

        for (const doc of targetDocs) {
            if (doc.month === 9) {
                sepTotalBDT += doc.amountInBDT;
                sepTotalAmount += doc.totalAmount; // This assumes USD for now
            } else {
                octTotalBDT += doc.amountInBDT;
                octTotalAmount += doc.totalAmount;
            }
        }

        console.log('--- Target (Migrated) Totals ---');
        console.log(
            'Sep BDT:',
            sepTotalBDT.toLocaleString(),
            'Amt:',
            sepTotalAmount.toLocaleString(),
        );
        console.log(
            'Oct BDT:',
            octTotalBDT.toLocaleString(),
            'Amt:',
            octTotalAmount.toLocaleString(),
        );

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
investigate();
