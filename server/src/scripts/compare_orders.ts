import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

// User provided mapping: Old ID => New ID
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

async function compare() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;

        console.log('Fetching clients...');
        const clients = await db.collection('clients').find({}).toArray();
        const clientMap = new Map();
        clients.forEach((c) => {
            if (c.clientId) clientMap.set(c.clientId, c._id.toString());
        });

        // Timeframe: Sep 1, 2025 to Oct 31, 2025
        const startDate = new Date('2025-09-01T00:00:00.000Z');
        const endDate = new Date('2025-10-31T23:59:59.999Z');

        console.log('Fetching OLD Earnings (Backup) in timeframe...');
        const backups = await db
            .collection('earnings_backup')
            .find({
                orderDate: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        console.log('Fetching NEW Orders in timeframe...');
        const orders = await db
            .collection('orders')
            .find({
                orderDate: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        // Let's verify WB_1001_31 (Highest discrepancy)
        const targetClient = 'WB_1001_31';
        const cid = clientMap.get(targetClient);

        if (!cid) {
            console.log(`Client ${targetClient} not found`);
            return;
        }

        const clientBackups = backups.filter(
            (b) => b.clientId.toString() === cid,
        );
        const clientOrders = orders.filter(
            (o) => o.clientId.toString() === cid,
        );

        console.log(`\n--- Deep Dive for ${targetClient} ---`);
        console.log(`OLD (Backup) Records: ${clientBackups.length}`);
        console.log(`NEW (Orders) Records: ${clientOrders.length}`);

        const oldSum = clientBackups.reduce(
            (acc, curr) => acc + (curr.orderAmount || 0),
            0,
        );
        const newSum = clientOrders.reduce(
            (acc, curr) => acc + (curr.totalPrice || 0),
            0,
        );

        console.log(`OLD Sum: ${oldSum.toFixed(2)}`);
        console.log(`NEW Sum: ${newSum.toFixed(2)}`);

        // Check for intersection
        const backupOrderIds = new Set(clientBackups.map((b) => b.orderId));
        // Note: New orders might NOT have 'orderId' field matching old structure if they were created fresh.
        // Wait, 'earnings_backup' document had 'orderId'. Let's see if that matches '_id' of 'orders'.
        // Check if orders collection _id matches orderId in backup

        let matchingCount = 0;
        let missingInOrders = 0;

        clientBackups.forEach((b) => {
            // Check if this backup order exists in the 'orders' list by _id
            const found = clientOrders.find(
                (o) => o._id.toString() === b.orderId,
            );
            if (found) matchingCount++;
            else missingInOrders++;
        });

        console.log(
            `\nBackup Orders found in New Orders Collection: ${matchingCount}`,
        );
        console.log(
            `Backup Orders MISSING in New Orders Collection: ${missingInOrders}`,
        );
        console.log(
            `Total New Orders: ${clientOrders.length} (Expected > ${clientBackups.length})`,
        );

        console.log(
            '\nSample New Orders not in Backup (Potential extra data):',
        );
        const extraOrders = clientOrders
            .filter((o) => !backupOrderIds.has(o._id.toString()))
            .slice(0, 5);
        extraOrders.forEach((o) => {
            console.log(
                `- ID: ${o._id}, Date: ${o.orderDate}, Amount: ${o.totalPrice}, Name: ${o.orderName}`,
            );
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
compare();
