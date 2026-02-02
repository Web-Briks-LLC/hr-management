import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

// User provided mapping: Old Client ID => New Client ID mapping
// In Old DB (localOrderList), clientID is like "WB_1003_50"
// In New DB (orders), clientId is an ObjectId referencing 'clients' collection, which has 'clientId' field "WB_1003_50"

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

async function verifyCrossDB() {
    let connOld = null;
    let connNew = null;

    try {
        console.log('Connecting to Databases...');
        // We need 2 separate connections
        connOld = await mongoose
            .createConnection(uri!, { dbName: 'hrManagement' })
            .asPromise();
        connNew = await mongoose
            .createConnection(uri!, { dbName: 'hr-management' })
            .asPromise();

        console.log('Connected.');

        // 1. Fetch Client List from New DB to Map String -> ObjectId
        const clientsNew = await connNew
            .collection('clients')
            .find({})
            .toArray();
        const clientMap = new Map(); // "WB_1001_31" -> ObjectId
        clientsNew.forEach((c) => {
            if (c.clientId) clientMap.set(c.clientId, c._id.toString());
        });

        // 2. Fetch Data (Jan 1, 2025 to Oct 31, 2025)
        const startDate = new Date('2025-01-01T00:00:00.000Z');
        const endDate = new Date('2025-10-31T23:59:59.999Z');

        console.log(
            `Fetching OLD orders (localOrderList) for 2025 (Jan-Oct)...`,
        );
        const oldOrders = await connOld
            .collection('localOrderList')
            .find({
                date: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        console.log(`Fetching NEW orders (orders) for 2025 (Jan-Oct)...`);
        const newOrders = await connNew
            .collection('orders')
            .find({
                orderDate: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        // 3. Aggregate
        const oldSums = new Map(); // "WB_1001_31" -> number
        oldOrders.forEach((o) => {
            const cid = o.clientID; // String ID
            const amount = parseFloat(o.orderPrice) || 0;
            oldSums.set(cid, (oldSums.get(cid) || 0) + amount);
        });

        const newSums = new Map(); // "WB_1001_31" -> number
        // New orders use ObjectId, so we must map back to String
        // Or Map clientMap String->ObjectId so we can lookup ObjectId key
        // Let's use String ID as key for report

        // Reverse Map: ObjectId -> String
        const idToString = new Map();
        for (const [key, value] of clientMap.entries()) {
            idToString.set(value, key);
        }

        newOrders.forEach((o) => {
            const cidStr = idToString.get(o.clientId.toString());
            if (cidStr) {
                const amount = o.totalPrice || 0;
                newSums.set(cidStr, (newSums.get(cidStr) || 0) + amount);
            }
        });

        // 4. Report
        console.log(
            '\n--- CROSS-DB VERIFICATION REPORT (Jan 2025 - Oct 2025) ---',
        );
        console.log(
            'Client ID'.padEnd(25) +
                ' | ' +
                'Old (hrManagement)'.padEnd(20) +
                ' | ' +
                'New (hr-management)'.padEnd(20) +
                ' | ' +
                'Diff',
        );
        console.log('-'.repeat(100));

        let matchCount = 0;
        let mismatchCount = 0;

        for (const mapItem of clientMappingRaw) {
            const targetClientIdStr = mapItem.new; // Use new ID (Assuming old ID maps to it or is same)
            // Wait, old collection uses 'clientID'. User supplied 'old' vs 'new' mapping.
            // We should use 'old' key to lookup in oldSums, and 'new' key to lookup in newSums.

            const oldKey = mapItem.old;
            const newKey = mapItem.new;

            const valOld = oldSums.get(oldKey) || 0;
            const valNew = newSums.get(newKey) || 0;

            const diff = valNew - valOld;
            const diffStr = Math.abs(diff) < 0.1 ? 'MATCH' : diff.toFixed(2);

            if (diffStr === 'MATCH') matchCount++;
            else mismatchCount++;

            console.log(
                `${newKey.padEnd(25)} | ` +
                    `${valOld.toFixed(2).padEnd(20)} | ` +
                    `${valNew.toFixed(2).padEnd(20)} | ` +
                    `${diffStr}`,
            );
        }

        console.log('-'.repeat(100));
        console.log(`Total Matches: ${matchCount}`);
        console.log(`Total Mismatches: ${mismatchCount}`);
        console.log(`Old Orders Fetched: ${oldOrders.length}`);
        console.log(`New Orders Fetched: ${newOrders.length}`);
    } catch (e) {
        console.error(e);
    } finally {
        if (connOld) await connOld.close();
        if (connNew) await connNew.close();
    }
}

verifyCrossDB();
