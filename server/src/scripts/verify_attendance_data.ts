import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { startOfMonth, endOfMonth } from 'date-fns';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function verifyAttendance() {
    console.log('Verifying Attendance Data (attendancedays)...');
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');

        // Force correct collection
        const attCollName = 'attendancedays';
        console.log('Using attendance collection:', attCollName);
        const attColl = db.collection(attCollName);

        // Check for Jan 2026 and Feb 2026
        const months = ['2026-01-01', '2026-02-01'];

        for (const m of months) {
            const start = startOfMonth(new Date(m));
            const end = endOfMonth(new Date(m));

            console.log(
                `\nChecking for month: ${m} (${start.toISOString()} - ${end.toISOString()})`,
            );

            const count = await attColl.countDocuments({
                date: { $gte: start, $lte: end },
            });
            console.log(`Total records: ${count}`);

            if (count > 0) {
                const stats = await attColl
                    .aggregate([
                        { $match: { date: { $gte: start, $lte: end } } },
                        { $group: { _id: '$status', count: { $sum: 1 } } },
                    ])
                    .toArray();
                console.log('Status distribution:', stats);

                // Sample one record to check structure
                const sample = await attColl.findOne({
                    date: { $gte: start, $lte: end },
                });
                console.log('Sample record:', JSON.stringify(sample, null, 2));
            } else {
                console.log('NO DATA found for this month.');
            }
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

verifyAttendance();
