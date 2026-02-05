import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function debugPayroll() {
    console.log('Debugging Payroll Calculation Logic...');
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        if (!db) throw new Error('DB error');

        const staffColl = db.collection('staffs'); // 'Staff' model -> 'staffs'
        const attColl = db.collection('attendancedays');

        const monthStr = '2026-02'; // Target month
        const startDate = startOfMonth(new Date(monthStr));
        const endDate = endOfMonth(new Date(monthStr));

        console.log(
            `Period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
        );

        // 1. Fetch Active Staff
        const staffs = await staffColl.find({ status: 'active' }).toArray();
        console.log(`Found ${staffs.length} active staff.`);

        if (staffs.length === 0) {
            console.log('No active staff found.');
            return;
        }

        const staffIds = staffs.map((s) => s._id);

        // 2. Fetch Attendance
        const allAttendance = await attColl
            .find({
                staffId: { $in: staffIds },
                date: { $gte: startDate, $lte: endDate },
            })
            .toArray();
        console.log(
            `Fetched ${allAttendance.length} attendance records for these staff.`,
        );

        if (allAttendance.length > 0) {
            // Check status for first record
            console.log(
                'First attendance record status:',
                allAttendance[0].status,
            );
        }

        // 3. Simulate Logic
        let zeroCountStaff = 0;
        let validCountStaff = 0;

        for (const staff of staffs.slice(0, 5)) {
            // Check first 5 staff
            const sId = staff._id.toString();
            console.log(
                `\nChecking Staff: ${sId} (${staff.name || 'No Name'})`,
            ); // Name likely in separate user collection lookup

            const staffAttendance = allAttendance.filter(
                (a) => a.staffId.toString() === sId,
            );
            console.log(`Matches found in array: ${staffAttendance.length}`);

            const presentDays = staffAttendance.filter((a) =>
                ['present', 'late', 'half_day', 'early_exit'].includes(
                    a.status,
                ),
            ).length;

            const absentDays = staffAttendance.filter(
                (a) => a.status === 'absent',
            ).length;

            const lateDays = staffAttendance.filter(
                (a) => a.status === 'late',
            ).length;

            console.log(
                `Calculated -> Present: ${presentDays}, Absent: ${absentDays}, Late: ${lateDays}`,
            );

            if (presentDays > 0) validCountStaff++;
            else zeroCountStaff++;
        }

        console.log('\nSummary of first 5:');
        console.log(`Staff with >0 present: ${validCountStaff}`);
        console.log(`Staff with 0 present: ${zeroCountStaff}`);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

debugPayroll();
