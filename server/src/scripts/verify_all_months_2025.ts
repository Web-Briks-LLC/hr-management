import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

const monthMap: { [key: string]: number } = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
};

async function verifyAll() {
    console.log('Starting full verification Jan-Oct 2025...');
    try {
        await mongoose.connect(MONGO_URI);
        const client = mongoose.connection.getClient();

        const sourceDb = client.db('hrManagement');
        const sourceColl = sourceDb.collection('earningsList');

        const targetDb = mongoose.connection.db;
        if (!targetDb) throw new Error('Target DB not found');
        const targetColl = targetDb.collection('earnings');

        console.log(
            'Month | Legacy Count | New Count | Legacy BDT | New BDT | Legacy USD | New USD | Status Match?',
        );
        console.log(
            '------------------------------------------------------------------------------------------------',
        );

        let allMatch = true;

        for (let m = 1; m <= 10; m++) {
            // Source stats
            // Need to match month string
            const monthNames = Object.keys(monthMap).filter(
                (key) => monthMap[key] === m,
            );
            // Create regex for month names (case insensitive)
            const monthRegex = new RegExp(monthNames.join('|'), 'i');

            const legacyDocs = await sourceColl
                .find({
                    month: { $regex: monthRegex },
                    date: { $regex: /2025/ },
                })
                .toArray();

            const legacyCount = legacyDocs.length;
            const legacyBDT = legacyDocs.reduce(
                (sum, doc) => sum + (doc.convertedBdt || 0),
                0,
            );
            const legacyUSD = legacyDocs.reduce(
                (sum, doc) => sum + (doc.totalUsd || 0),
                0,
            );

            // Source Status Check (just info)
            const legacyUnpaid = legacyDocs.filter(
                (d) => d.status?.toLowerCase() === 'unpaid',
            ).length;

            // Target stats
            const targetDocs = await targetColl
                .find({
                    year: 2025,
                    month: m,
                    isLegacy: true,
                })
                .toArray();

            const targetCount = targetDocs.length;
            const targetBDT = targetDocs.reduce(
                (sum, doc) => sum + (doc.amountInBDT || 0),
                0,
            );
            const targetUSD = targetDocs.reduce(
                (sum, doc) => sum + (doc.totalAmount || 0),
                0,
            );

            // Target Status Check
            const targetUnpaid = targetDocs.filter(
                (d) => d.status === 'unpaid',
            ).length;

            const bdtMatch = Math.abs(legacyBDT - targetBDT) < 1; // tolerance
            const usdMatch = Math.abs(legacyUSD - targetUSD) < 1;
            const countMatch = legacyCount === targetCount;
            const statusMatch = legacyUnpaid === targetUnpaid; // Check if we preserved unpaid status?
            // Note: Migration script set everything to 'paid' initially?
            // Checking source status to see if it matters.

            const statusStr = statusMatch
                ? 'OK'
                : `Diff (L:${legacyUnpaid} vs N:${targetUnpaid})`;
            const rowMatch = bdtMatch && usdMatch && countMatch;

            if (!rowMatch) allMatch = false;

            console.log(
                `${m.toString().padEnd(5)} | ` +
                    `${legacyCount.toString().padEnd(12)} | ` +
                    `${targetCount.toString().padEnd(9)} | ` +
                    `${legacyBDT.toLocaleString().padEnd(10)} | ` +
                    `${targetBDT.toLocaleString().padEnd(7)} | ` +
                    `${legacyUSD.toLocaleString().padEnd(10)} | ` +
                    `${targetUSD.toFixed(2).padEnd(7)} | ` +
                    (rowMatch ? 'MATCH' : 'MISMATCH') +
                    (legacyUnpaid > 0 || targetUnpaid > 0
                        ? ` ${statusStr}`
                        : ''),
            );
        }

        console.log(
            '------------------------------------------------------------------------------------------------',
        );
        if (allMatch) {
            console.log('All months match perfectly!');
        } else {
            console.log('Some discrepancies found.');
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

verifyAll();
