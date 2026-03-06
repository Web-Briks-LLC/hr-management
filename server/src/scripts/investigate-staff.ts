import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { eachDayOfInterval } from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';

dotenv.config();

const uri = process.env.OFFICE_MONGO_URI;

async function investigate() {
    try {
        if (!uri) {
            console.error('FATAL: OFFICE_MONGO_URI not found');
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log('Connected to DB');

        const names = ['Ayat Rana', 'Md Moni mia', 'Asaduzzaman Didar'];

        // BETTER-AUTH collection is 'user'
        const users = await mongoose.connection
            .collection('user')
            .find({
                name: { $in: names.map((n) => new RegExp(n, 'i')) },
            })
            .toArray();

        console.log(`Found ${users.length} users in 'user' collection`);

        const userIds = users.map((u) => u._id);

        const staffs = await StaffModel.find({
            userId: { $in: userIds },
        }).lean();

        console.log(
            `Found ${staffs.length} staff records linked to found users.`,
        );

        const year = 2026;
        const monthNum = 2;
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
        const salaryCategory = await ExpenseCategoryModel.findOne({
            name: /^Salary/i,
        });

        if (!salaryCategory) {
            console.error('Salary category not found');
            process.exit(1);
        }

        const todayUTCStr = new Date().toISOString().split('T')[0] as string;

        for (const staff of staffs) {
            const userObj = users.find(
                (u) => u._id.toString() === (staff.userId as any).toString(),
            );
            const userName = userObj?.name || 'Unknown';

            console.log(`\n--- [STAFF REPORT] ${userName} ---`);
            console.log(`ID: ${staff.staffId} | Base: ${staff.salary}`);

            const joinStr = staff.joinDate
                ? (new Date(staff.joinDate)
                      .toISOString()
                      .split('T')[0] as string)
                : null;
            const exitStr = staff.exitDate
                ? (new Date(staff.exitDate)
                      .toISOString()
                      .split('T')[0] as string)
                : null;
            console.log(`Join Date (UTC): ${joinStr || 'N/A'}`);
            console.log(`Exit Date (UTC): ${exitStr || 'N/A'}`);

            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id as any,
                isActive: true,
            }).lean();
            const shift = shiftAssignment
                ? await ShiftModel.findById(
                      shiftAssignment.shiftId as any,
                  ).lean()
                : null;

            if (!shift) {
                console.log('No shift assignment found.');
                continue;
            }
            console.log(`Shift: ${shift.name} (Workdays: ${shift.workDays})`);

            const staffAttendance = await AttendanceDayModel.find({
                staffId: staff._id as any,
                date: { $gte: startDate, $lte: endDate } as any,
            })
                .sort({ date: 1 })
                .lean();

            console.log(`Attendance count for Feb: ${staffAttendance.length}`);

            const present = staffAttendance.filter((a) =>
                ['present', 'late', 'half_day', 'early_exit'].includes(
                    a.status,
                ),
            ).length;
            const literalAbsent = staffAttendance.filter(
                (a) => a.status === 'absent',
            ).length;

            // Accurate Unemployment logic
            let unempCount = 0;
            const daysInMonth = eachDayOfInterval({
                start: startDate,
                end: endDate,
            });
            daysInMonth.forEach((d) => {
                const dayStr = d.toISOString().split('T')[0] as string;
                if (
                    (joinStr && dayStr < joinStr) ||
                    (exitStr && dayStr > exitStr)
                )
                    unempCount++;
            });
            console.log(`Unemployed days in Feb: ${unempCount}`);

            // Accurate Work Days logic (In Period)
            const expectedDates = daysInMonth.filter((d) => {
                const dayStr = d.toISOString().split('T')[0] as string;
                const isWorkDay = shift.workDays.includes(d.getUTCDay() as any);
                const isEmployed =
                    (!joinStr || dayStr >= joinStr) &&
                    (!exitStr || dayStr <= exitStr);
                return isWorkDay && isEmployed;
            });
            console.log(
                `Expected Work Days (In Employed Period): ${expectedDates.length}`,
            );

            // Accurate Missing Punches logic
            const missingPunches = expectedDates.filter((d) => {
                const dayStr = d.toISOString().split('T')[0] as string;
                if (dayStr >= todayUTCStr) return false;
                const hasRecord = staffAttendance.some(
                    (a) =>
                        (new Date(a.date)
                            .toISOString()
                            .split('T')[0] as string) === dayStr,
                );
                return !hasRecord;
            });
            console.log(
                `Missing Punches (Working but No Record): ${missingPunches.length}`,
            );

            const totalAbsent = literalAbsent + missingPunches.length;
            const units = totalAbsent + unempCount;
            const perDay = staff.salary / 30;
            const estSalary = Math.max(0, staff.salary - units * perDay);

            console.log(
                `Total Deduction Units (Absent ${totalAbsent} + Unemp ${unempCount}): ${units}`,
            );
            console.log(`Estimated Payable: ${Math.round(estSalary)}`);

            const expense = await ExpenseModel.findOne({
                staffId: staff._id as any,
                categoryId: salaryCategory._id as any,
                date: { $gte: startDate, $lte: endDate } as any,
            }).lean();

            if (expense) {
                console.log(
                    `Actual Expense Found: ${expense.amount} (Note: ${expense.note})`,
                );
            } else {
                console.log('No paid Expense record for Feb.');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

investigate();
