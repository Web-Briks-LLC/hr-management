import mongoose from 'mongoose';
import envConfig from '../config/env.config.js';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(envConfig.mongo_uri);
        console.log('Connected.');

        const name = 'wazed akndo';
        const usersCollection = mongoose.connection.collection('user');

        const regex = new RegExp(name.split(' ').join('.*'), 'i');
        const user = await usersCollection.findOne({ name: regex });

        if (!user) {
            console.log('User not found');
            return;
        }

        const staff = await StaffModel.findOne({ userId: user._id });
        console.log(`Staff: ${user.name}`);
        console.log(`Join Date: ${staff.joinDate}`);

        // Shift Info
        const assignment = await ShiftAssignmentModel.findOne({
            staffId: staff._id,
            isActive: true,
        });
        if (assignment) {
            const shift = await ShiftModel.findById(assignment.shiftId);
            console.log(`Shift: ${shift.name}`);
            console.log(
                `Work Days: ${shift.workDays} (Start: ${shift.startTime})`,
            );
        }

        const records = await AttendanceDayModel.find({
            staffId: staff._id,
            date: {
                $gte: new Date('2026-01-01'),
                $lte: new Date('2026-01-31'),
            },
        }).sort({ date: 1 });

        console.log(`\nAttendance Records (${records.length}):`);
        records.forEach((r) => {
            const checkIn = r.checkInAt
                ? r.checkInAt.toLocaleTimeString()
                : 'N/A';
            console.log(
                `- ${r.date.toDateString()}: ${r.status.toUpperCase()} (In: ${checkIn}, Late: ${r.lateMinutes}m)`,
            );
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

run();
