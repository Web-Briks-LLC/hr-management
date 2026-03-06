import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { eachDayOfInterval, format } from 'date-fns';
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
            console.error('FATAL: Salary category not found');
            process.exit(1);
        }

        for (const staff of staffs) {
            const userObj = users.find(
                (u) => u._id.toString() === (staff.userId as any).toString(),
            );
            const userName = userObj?.name || 'Unknown';

            console.log(`\n--- [STAFF REPORT] ${userName} ---`);
            console.log(
                `ID: ${staff.staffId} | Status: ${staff.status} | Base: ${staff.salary}`,
            );
            console.log(
                `Join Date: ${staff.joinDate ? format(new Date(staff.joinDate), 'yyyy-MM-dd HH:mm') : 'N/A'}`,
            );
            console.log(
                `Exit Date: ${staff.exitDate ? format(new Date(staff.exitDate), 'yyyy-MM-dd HH:mm') : 'N/A'}`,
            );

            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id as any,
                isActive: true,
            }).lean();
            const shift = shiftAssignment
                ? await ShiftModel.findById(
                      shiftAssignment.shiftId as any,
                  ).lean()
                : null;

            if (shift) {
                console.log(
                    `Shift: ${shift.name} (Workdays: ${shift.workDays})`,
                );
            } else {
                console.log('No shift assignment found.');
            }

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
            const absent = staffAttendance.filter(
                (a) => a.status === 'absent',
            ).length;
            console.log(`Summary: Present: ${present}, Absent: ${absent}`);

            // Unemployed check
            let unempCount = 0;
            const daysInMonth = eachDayOfInterval({
                start: startDate,
                end: endDate,
            });
            const join = staff.joinDate ? new Date(staff.joinDate) : null;
            const exit = staff.exitDate ? new Date(staff.exitDate) : null;

            daysInMonth.forEach((d) => {
                if ((join && d < join) || (exit && d > exit)) unempCount++;
            });
            console.log(
                `Unemployed days in Feb (based on join/exit): ${unempCount}`,
            );

            const expense = await ExpenseModel.findOne({
                staffId: staff._id as any,
                categoryId: salaryCategory._id as any,
                date: { $gte: startDate, $lte: endDate } as any,
            }).lean();

            if (expense) {
                console.log(
                    `Paid Amount: ${expense.amount} | Note: ${expense.note}`,
                );
            } else {
                console.log('No Expense for Feb.');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

investigate();
