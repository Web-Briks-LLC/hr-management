/**
 * Migration Script: Deduplicate AttendanceDay and Overtime records
 *
 * WHY: We added unique compound indexes:
 *   - AttendanceDay: { staffId: 1, date: 1 } unique
 *   - Overtime: { staffId: 1, date: 1, type: 1 } unique
 *
 * If duplicates exist, Mongoose will fail to create these indexes.
 * This script finds and removes duplicates (keeping the newest one).
 *
 * RUN: npx tsx scripts/migrate-deduplicate.ts
 */

import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI!;

async function run() {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI not found in .env');
        process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    if (!db) {
        console.error('❌ DB connection failed');
        process.exit(1);
    }

    // --- 1. Deduplicate AttendanceDay (staffId + date) ---
    console.log('📋 Checking AttendanceDays for duplicates...');
    const attendanceDups = await db
        .collection('attendancedays')
        .aggregate([
            {
                $group: {
                    _id: { staffId: '$staffId', date: '$date' },
                    count: { $sum: 1 },
                    docs: { $push: '$_id' },
                },
            },
            { $match: { count: { $gt: 1 } } },
        ])
        .toArray();

    let attendanceRemoved = 0;
    for (const dup of attendanceDups) {
        // Keep the first (oldest), remove the rest
        const toRemove = dup.docs.slice(1);
        await db
            .collection('attendancedays')
            .deleteMany({ _id: { $in: toRemove } });
        attendanceRemoved += toRemove.length;
    }

    if (attendanceRemoved > 0) {
        console.log(
            `  ⚠️  Removed ${attendanceRemoved} duplicate AttendanceDay records`,
        );
    } else {
        console.log('  ✅ No duplicates found in AttendanceDays');
    }

    // --- 2. Deduplicate Overtime (staffId + date + type) ---
    console.log('\n📋 Checking Overtimes for duplicates...');
    const overtimeDups = await db
        .collection('overtimes')
        .aggregate([
            {
                $group: {
                    _id: {
                        staffId: '$staffId',
                        date: '$date',
                        type: '$type',
                    },
                    count: { $sum: 1 },
                    docs: { $push: '$_id' },
                },
            },
            { $match: { count: { $gt: 1 } } },
        ])
        .toArray();

    let overtimeRemoved = 0;
    for (const dup of overtimeDups) {
        const toRemove = dup.docs.slice(1);
        await db.collection('overtimes').deleteMany({ _id: { $in: toRemove } });
        overtimeRemoved += toRemove.length;
    }

    if (overtimeRemoved > 0) {
        console.log(
            `  ⚠️  Removed ${overtimeRemoved} duplicate Overtime records`,
        );
    } else {
        console.log('  ✅ No duplicates found in Overtimes');
    }

    // --- Summary ---
    console.log('\n─────────────────────────────────────');
    console.log('📊 Migration Summary:');
    console.log(`   AttendanceDay duplicates removed: ${attendanceRemoved}`);
    console.log(`   Overtime duplicates removed: ${overtimeRemoved}`);
    console.log('─────────────────────────────────────');
    console.log('✅ Migration complete. Safe to restart the server.\n');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
