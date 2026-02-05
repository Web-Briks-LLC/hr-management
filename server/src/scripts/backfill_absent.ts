import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
    startOfDay,
    endOfDay,
    eachDayOfInterval,
    isBefore,
    startOfMonth,
    endOfMonth,
} from 'date-fns';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function backfillAbsent() {
    console.log('Starting Backfill for Missing Absent Records...');
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');

        const staffColl = db.collection('staffs');
        const shiftAssignColl = db.collection('shiftassignments');
        const shiftColl = db.collection('shifts');
        const attColl = db.collection('attendancedays');

        // Target Period: Jan 1, 2026 to Yesterday (Feb 4, 2026)
        // Adjust start date as needed.
        const startPeriod = new Date('2026-01-01');
        const endPeriod = new Date(); // Today
        endPeriod.setDate(endPeriod.getDate() - 1); // Up to yesterday

        console.log(
            `Backfilling period: ${startPeriod.toISOString()} to ${endPeriod.toISOString()}`,
        );

        const daysToProcess = eachDayOfInterval({
            start: startPeriod,
            end: endPeriod,
        });

        // 1. Get Active Staff
        const staffs = await staffColl.find({ status: 'active' }).toArray();
        console.log(`Found ${staffs.length} active staff.`);

        let totalAdded = 0;

        for (const staff of staffs) {
            // Get active shift assignment
            const assignment = await shiftAssignColl.findOne({
                staffId: staff._id,
                isActive: true,
            });

            if (!assignment) {
                // console.log(`No active shift for staff ${staff.name} (${staff._id})`);
                continue;
            }

            const shift = await shiftColl.findOne({ _id: assignment.shiftId });
            if (!shift || !shift.workDays) continue;

            const workDays = shift.workDays; // Array of numbers [0..6]

            for (const day of daysToProcess) {
                const dayOfWeek = day.getDay();
                if (!workDays.includes(dayOfWeek)) continue; // Weekend/Offday

                // Check entries
                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);

                const existing = await attColl.findOne({
                    staffId: staff._id,
                    date: { $gte: dayStart, $lte: dayEnd },
                });

                if (!existing) {
                    // Create ABSENT record
                    await attColl.insertOne({
                        staffId: staff._id,
                        shiftId: shift._id,
                        date: dayStart, // Store as start of day or specific time? Scheduler uses todayStart
                        status: 'absent',
                        isAutoAbsent: true,
                        notes: 'Backfilled by Admin Script',
                        processedAt: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        __v: 0,
                        checkInAt: null,
                        checkOutAt: null,
                        totalMinutes: 0,
                        lateMinutes: 0,
                        earlyExitMinutes: 0,
                        otMinutes: 0,
                        payableAmount: 0,
                        deductionAmount: 0,
                        otAmount: 0,
                        isManual: false,
                    });
                    // console.log(`Marked ABSENT for ${staff._id} on ${day.toISOString().split('T')[0]}`);
                    totalAdded++;
                }
            }
        }

        console.log(`Backfill complete. Added ${totalAdded} absent records.`);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

backfillAbsent();
