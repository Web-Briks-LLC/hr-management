import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { eachDayOfInterval, format } from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';

dotenv.config();

const uri = process.env.OFFICE_MONGO_URI;

async function investigate() {
    try {
        await mongoose.connect(uri as string);
        console.log('Connected to DB');

        const names = ['Ayat Rana', 'Md Moni mia', 'Asaduzzaman Didar'];

        // Find users first since name is stored there
        const users = await mongoose.connection
            .collection('users')
            .find({
                name: { $in: names.map((n) => new RegExp(n, 'i')) },
            })
            .toArray();

        const userIds = users.map((u) => u._id);

        const staffs = await StaffModel.find({
            userId: { $in: userIds },
        })
            .populate('userId')
            .lean();

        console.log(`Found ${staffs.length} staffs`);

        const year = 2026;
        const monthNum = 2;
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

        for (const staff of staffs) {
            const userName = (staff.userId as any)?.name || 'Unknown';
            console.log(`\n--- Staff: ${userName} (${staff.staffId}) ---`);
            console.log(
                `Join Date: ${staff.joinDate ? format(staff.joinDate, 'yyyy-MM-dd') : 'N/A'}`,
            );
            console.log(`Status: ${staff.status}`);

            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id,
                isActive: true,
            }).lean();
            if (!shiftAssignment) {
                console.log('No active shift assignment found');
                continue;
            }

            const shift = await ShiftModel.findById(
                shiftAssignment.shiftId,
            ).lean();
            if (!shift) {
                console.log('Shift not found');
                continue;
            }

            console.log(`Shift: ${shift.name} (Workdays: ${shift.workDays})`);

            const attendances = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            })
                .sort({ date: 1 })
                .lean();

            console.log(`Total Attendance Records: ${attendances.length}`);
            attendances.forEach((a) => {
                console.log(
                    `${format(a.date, 'yyyy-MM-dd')}: ${a.status} (Manual: ${a.isManual}, AutoAbsent: ${a.isAutoAbsent})`,
                );
            });

            // Calculate expected workdays
            const daysInMonth = eachDayOfInterval({
                start: startDate,
                end: endDate,
            });
            const expected = daysInMonth.filter((day) => {
                if (!shift.workDays.includes(day.getDay() as any)) return false;
                if (staff.joinDate && day < staff.joinDate) return false;
                if (staff.exitDate && day > staff.exitDate) return false;
                return true;
            });

            console.log(`Expected Workdays: ${expected.length}`);

            const missing = expected.filter((day) => {
                return !attendances.some(
                    (a) =>
                        format(a.date, 'yyyy-MM-dd') ===
                        format(day, 'yyyy-MM-dd'),
                );
            });

            console.log(
                `Missing Dates: ${missing.map((d) => format(d, 'yyyy-MM-dd')).join(', ')}`,
            );
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

investigate();
