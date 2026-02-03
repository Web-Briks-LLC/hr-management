import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const uri = process.env.MONGO_URI;

// User provided mapping: Old ID => New ID
// Although both might point to the same ObjectId, we will focus on the "New ID" (Right side)
// to look up in the 'clients' collection.
const clientMappingRaw = [
    { old: 'WB Jamirul', new: 'WB Jamirul' },
    { old: 'WB1031 Tanvir', new: 'WB1031 Tanvir' },
    { old: 'WB1030-98', new: 'WB1030-98' },
    { old: 'WB 1029-Valdes', new: 'WB 1029-Valdes' },
    { old: 'WB-1029-Nadir', new: 'WB-1029-Nadir' },
    { old: 'WB 1028-97', new: 'WB_1028_97' },
    { old: 'WB 1027-94', new: 'WB 1027-94' },
    { old: 'WB 1026 -93', new: 'WB_1026_93' },
    { old: 'WB 1025-92', new: 'WB_1025_92' },
    { old: 'WB-1024-91', new: 'WB_1024_91' },
    { old: 'WB-1023-79', new: 'WB_1023_79' },
    { old: 'WB-1022-90', new: 'WB_1022_90' },
    { old: 'WB-1021-89', new: 'WB_1021_89' },
    { old: 'WB-1020-88', new: 'WB_1020_88' },
    { old: 'WB1019-87', new: 'WB_1019_87' },
    { old: 'WB1018-84', new: 'WB_1018-84' },
    { old: 'WB_1017-Lorenco', new: 'WB_1017_Lorenco' },
    { old: 'WB_1015-195', new: 'WB_1015-195' },
    { old: 'WB_1014-183', new: 'WB_1014-183' },
    { old: 'WB_1013_James', new: 'WB_1013_James' },
    { old: 'WB_1012_83', new: 'WB_1012_83' },
    { old: 'WB_1011_80', new: 'WB_1011_80' },
    { old: 'WB_1010_78', new: 'WB_1010_78' },
    { old: 'WB_1009_74', new: 'WB_1009_74' },
    { old: 'WB_1008_69', new: 'WB_1008_69' },
    { old: 'WB_1007_61', new: 'WB_1007_61' },
    { old: 'WB_1005_25', new: 'WB_1005_25' },
    { old: 'WB_1005_04', new: 'WB_1005_04' },
    { old: 'WB_1004_53', new: 'WB_1004_53' },
    { old: 'WB_1003_50', new: 'WB_1003_50' },
    { old: 'WB_1002_40', new: 'WB_1002_40' },
    { old: 'WB_1001_31', new: 'WB_1001_31' },
];

async function verify() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB not connected');

        console.log('Fetching clients...');
        const clients = await db.collection('clients').find({}).toArray();
        // Map Client String ID (New) -> ObjectId
        const clientMap = new Map(); // "WB_1001_31" -> ObjectId
        const idToClientString = new Map(); // ObjectId -> "WB_1001_31"

        clients.forEach((c) => {
            if (c.clientId) {
                clientMap.set(c.clientId, c._id.toString());
                idToClientString.set(c._id.toString(), c.clientId);
            }
        });

        // Define Timeframe: Sep 1, 2025 to Oct 31, 2025 (Available in Backup)
        const startDate = new Date('2025-09-01T00:00:00.000Z');
        const endDate = new Date('2025-10-31T23:59:59.999Z');

        console.log('Fetching OLD Earnings (from earnings_backup)...');
        const oldEarnings = await db
            .collection('earnings_backup')
            .find({
                orderDate: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        console.log(
            `Found ${oldEarnings.length} old earning records in timeframe.`,
        );

        // Aggregate Old Earnings by ObjectId
        const oldSums = new Map<string, number>();
        oldEarnings.forEach((e) => {
            const cid = e.clientId.toString();
            const amount = e.orderAmount || 0; // Use orderAmount for raw orders
            oldSums.set(cid, (oldSums.get(cid) || 0) + amount);
        });

        console.log('Fetching NEW Earnings (from earnings)...');
        // Filter by year 2025, months 9 and 10
        const newEarnings = await db
            .collection('earnings')
            .find({
                year: 2025,
                month: { $in: [9, 10] },
            })
            .toArray();

        console.log(
            `Found ${newEarnings.length} new earning records in timeframe.`,
        );

        // Aggregate New Earnings by ObjectId, separating Legacy and Native
        const newSumsLegacy = new Map<string, number>();
        const newSumsNative = new Map<string, number>();

        newEarnings.forEach((e) => {
            const cid = e.clientId.toString();
            const amount = e.totalAmount || 0;
            if (e.isLegacy) {
                newSumsLegacy.set(cid, (newSumsLegacy.get(cid) || 0) + amount);
            } else {
                newSumsNative.set(cid, (newSumsNative.get(cid) || 0) + amount);
            }
        });

        // ---------------------------------------------------------
        // Generate Report
        // ---------------------------------------------------------
        console.log('\n--- VERIFICATION REPORT (Jan 2025 - Oct 2025) ---');
        console.log(
            'Client ID (New)'.padEnd(25) +
                ' | ' +
                'Old (Backup)'.padEnd(15) +
                ' | ' +
                'New (Legacy)'.padEnd(15) +
                ' | ' +
                'New (Native)'.padEnd(15) +
                ' | ' +
                'Diff (Old vs Leg)',
        );
        console.log('-'.repeat(100));

        let matchCount = 0;
        let mismatchCount = 0;

        for (const mapItem of clientMappingRaw) {
            const targetClientIdStr = mapItem.new;
            const clientObjectId = clientMap.get(targetClientIdStr);

            if (!clientObjectId) {
                console.log(
                    `${targetClientIdStr.padEnd(25)} | CLIENT NOT FOUND IN DB`,
                );
                continue;
            }

            const oldTotal = oldSums.get(clientObjectId) || 0;
            const newTotalLegacy = newSumsLegacy.get(clientObjectId) || 0;
            const newTotalNative = newSumsNative.get(clientObjectId) || 0;

            const diff = newTotalLegacy - oldTotal;
            const diffStr = Math.abs(diff) < 0.1 ? 'MATCH' : diff.toFixed(2);

            if (diffStr === 'MATCH') matchCount++;
            else mismatchCount++;

            console.log(
                `${targetClientIdStr.padEnd(25)} | ` +
                    `${oldTotal.toFixed(2).padEnd(15)} | ` +
                    `${newTotalLegacy.toFixed(2).padEnd(15)} | ` +
                    `${newTotalNative.toFixed(2).padEnd(15)} | ` +
                    `${diffStr}`,
            );
        }

        console.log('-'.repeat(100));
        console.log(`Total Migration Matches: ${matchCount}`);
        console.log(`Total Mismatches: ${mismatchCount}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
