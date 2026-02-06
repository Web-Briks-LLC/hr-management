import mongoose from 'mongoose';
import envConfig from '../config/env.config.js';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';
import schedulerService from '../services/scheduler.service.js';
import { startOfDay } from 'date-fns';

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(envConfig.mongo_uri);
        console.log('Connected.');

        // 1. Pick a Staff Member (Puja Saha, already has shift)
        const staff = await StaffModel.findOne({ staffId: 'EMP0039' }); // Puja Saha
        if (!staff) throw new Error('Staff not found');

        const assignment = await ShiftAssignmentModel.findOne({
            staffId: staff._id,
            isActive: true,
        });
        if (!assignment) throw new Error('Shift assignment not found');

        const shift = await ShiftModel.findById(assignment.shiftId);

        // 2. Create a Mock "Late" Record for TODAY
        const now = new Date();
        const todayStart = startOfDay(now);

        // Ensure no record exists first
        await AttendanceDayModel.deleteOne({
            staffId: staff._id,
            date: todayStart,
        });

        console.log('Creating mock LATE record...');
        await AttendanceDayModel.create({
            staffId: staff._id,
            shiftId: assignment.shiftId,
            date: todayStart,
            status: 'late',
            isAutoAbsent: true,
            notes: 'Mock Late Record',
            checkInAt: null, // Crucial: No check-in
        });

        console.log('Mock Record Created. Running Scheduler...');

        // 3. Run Scheduler
        // We need to simulate time passing?
        // The scheduler uses 'now'. If 'now' is past the threshold, it should update.
        // Shift: HR Dhaka (Intern), Time: 00:00 - 20:00?
        // Let's check shift time.
        console.log(`Shift Query: ${shift.name}, Start: ${shift.startTime}`);

        // If current time is NOT past threshold, it won't update.
        // Threshold = StartTime + HalfDaysMinutes (default 240 = 4 hours)
        // If shift starts at 00:00, threshold is 04:00 AM.
        // Current time is likely evening (22:00). So it SHOULD update.

        await schedulerService.processAttendanceCheck();

        // 4. Verify Update
        const updatedRecord = await AttendanceDayModel.findOne({
            staffId: staff._id,
            date: todayStart,
        });
        console.log(`Updated Status: ${updatedRecord.status}`);
        console.log(`Notes: ${updatedRecord.notes}`);

        if (updatedRecord.status === 'absent') {
            console.log('SUCCESS: Record auto-upgraded to ABSENT.');
        } else {
            console.log(
                'FAILURE: Record remained LATE (or other). Check thresholds.',
            );
        }

        // Cleanup
        console.log('Cleaning up mock record...');
        await AttendanceDayModel.deleteOne({
            staffId: staff._id,
            date: todayStart,
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

run();
