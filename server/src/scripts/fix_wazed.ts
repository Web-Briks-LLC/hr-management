import mongoose from 'mongoose';
import envConfig from '../config/env.config.js';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';
import { startOfDay, endOfDay } from 'date-fns';

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(envConfig.mongo_uri);
        console.log('Connected.');

        const name = 'wazed akndo';
        const usersCollection = mongoose.connection.collection('user');

        const regex = new RegExp(name.split(' ').join('.*'), 'i');
        const user = await usersCollection.findOne({ name: regex });

        if (!user) throw new Error('User not found');

        const staff = await StaffModel.findOne({ userId: user._id });
        if (!staff) throw new Error('Staff not found');

        console.log(`Fixing attendance for: ${user.name}`);

        // Get Shift Start Time to set a valid CheckIn time
        const assignment = await ShiftAssignmentModel.findOne({
            staffId: staff._id,
            isActive: true,
        });
        let shiftStartTimeStr = '10:00'; // Default fallback
        if (assignment) {
            const shift = await ShiftModel.findById(assignment.shiftId);
            if (shift) shiftStartTimeStr = shift.startTime;
        }

        const [h, m] = shiftStartTimeStr.split(':').map(Number);

        // Find records Jan 1 - Jan 31
        const records = await AttendanceDayModel.find({
            staffId: staff._id,
            date: {
                $gte: new Date('2026-01-01'),
                $lte: new Date('2026-01-31'),
            },
        });

        console.log(`Found ${records.length} records. Updating...`);

        for (const record of records) {
            // Logic:
            // 1. If status is absent/late -> Change to 'present'
            // 2. Set checkInAt to Shift Start Time (10:00 AM on that day)
            // 3. Reset lateMinutes to 0

            const newStatus = 'present';

            // Create CheckIn Time
            const checkInTime = new Date(record.date);
            checkInTime.setHours(h, m, 0, 0);

            // Create CheckOut Time (Assume 8 hours work? or just leave null if not needed?
            // Usually present implies valid work hours. Let's set checkOut to checkIn + 9 hours
            // Shift is 10:00 - 18:00 (8 hours).
            const checkOutTime = new Date(checkInTime);
            checkOutTime.setHours(h + 8, m, 0, 0);

            // Update
            record.status = newStatus;
            record.checkInAt = checkInTime;
            record.checkOutAt = checkOutTime;
            record.lateMinutes = 0;
            record.totalMinutes = 480; // 8 hours
            record.notes = 'Correction Script: Marked Present';

            await record.save();
            console.log(
                `- Updated ${record.date.toDateString()}: Marked Present`,
            );
        }

        // Also check if Jan 15 (Join date) is missing (it was marked Absent in prev check, so it should be in records list)
        // If it was missing entirely, we would create it. But check_wazed.ts showed 15 records including Jan 15.
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

run();
