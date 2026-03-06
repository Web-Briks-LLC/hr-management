import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { eachDayOfInterval, format } from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import ShiftModel from '../models/shift.model.js';

dotenv.config();

const uri = process.env.OFFICE_MONGO_URI;

/**
 * Recalculates February 2026 data for all active staff,
 * creating missing "absent" punches so the Grace UI works
 * natively, and updating their final paid Expense.
 */
async function fixAllFebruaryData() {
    try {
        if (!uri) {
            console.error('FATAL: OFFICE_MONGO_URI is not defined in .env!');
            process.exit(1);
        }

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('Connected to office DB for complete February 2026 fix.');

        const year = 2026;
        const monthNum = 2; // February 2026
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

        const staffs = await StaffModel.find({
            $or: [{ status: 'active' }, { exitDate: { $gte: startDate } }],
        });

        console.log(`Checking ${staffs.length} staff members...`);

        const salaryCategory = await ExpenseCategoryModel.findOne({
            name: /^Salary/i,
        });

        if (!salaryCategory) {
            console.error(
                'FATAL: "Salary" expense category not found in the database!',
            );
            process.exit(1);
        }

        const daysInMonth = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        const todayStr = format(new Date(), 'yyyy-MM-dd');

        let modifiedEmployees = 0;
        let upsertedAttendances = 0;
        let modifiedExpenses = 0;

        for (const staff of staffs) {
            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id,
                isActive: true,
            });

            const shift = shiftAssignment
                ? await ShiftModel.findById(shiftAssignment.shiftId)
                : null;

            if (!shift) continue;

            // Get explicitly existing attendance records
            const existingAttendance = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            // Use a Set of YYYY-MM-DD strings for fast, timezone-agnostic lookup
            const existingDateStrings = new Set(
                existingAttendance.map((a) =>
                    format(new Date(a.date), 'yyyy-MM-dd'),
                ),
            );

            const joinDate = staff.joinDate ? new Date(staff.joinDate) : null;
            const exitDate = staff.exitDate ? new Date(staff.exitDate) : null;

            let newAbsentsForThisStaff = 0;

            for (const day of daysInMonth) {
                const dayStr = format(day, 'yyyy-MM-dd');

                // 1. Is it a working day for this shift?
                if (!shift.workDays.includes(day.getDay() as any)) continue;

                // 2. Was the staff employed on this day?
                if (joinDate && day < joinDate) continue;
                if (exitDate && day > exitDate) continue;

                // 3. Is the day in the past? (Don't create absents for today/future)
                if (dayStr >= todayStr) continue;

                // 4. Do we already have a record (present, absent, etc.)?
                if (!existingDateStrings.has(dayStr)) {
                    // Create literal "absent" record
                    await AttendanceDayModel.create({
                        staffId: staff._id,
                        shiftId: shift._id,
                        date: new Date(dayStr + 'T00:00:00.000Z'), // Force UTC midnight
                        status: 'absent',
                        isAutoAbsent: true,
                        notes: '[Auto Generated Missing Punch]',
                    });
                    newAbsentsForThisStaff++;
                    upsertedAttendances++;
                    existingDateStrings.add(dayStr);
                }
            }

            // Recalculate salary based on total absent counts (including new ones)
            const updatedAttendance = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            const totalAbsentDays = updatedAttendance.filter(
                (a) => a.status === 'absent',
            ).length;

            let unemployedDays = 0;
            daysInMonth.forEach((day) => {
                if (
                    (joinDate && day < joinDate) ||
                    (exitDate && day > exitDate)
                ) {
                    unemployedDays++;
                }
            });

            const staffSalary = staff.salary || 0;
            const perDaySalary = staffSalary / 30;
            // Formula: Base - (Absent + Unemployed) * (Base/30)
            const expectedPayable = Math.max(
                0,
                staffSalary - (totalAbsentDays + unemployedDays) * perDaySalary,
            );
            const expectedRounded = Math.round(expectedPayable);

            // Fetch the payment record
            const expense = await ExpenseModel.findOne({
                categoryId: salaryCategory._id as any, // Cast to any to bypass exactOptionalPropertyTypes strictness if needed, or just use non-null
                staffId: staff._id as any,
                date: { $gte: startDate, $lte: endDate } as any,
            });

            if (expense) {
                let bonus = 0;
                let deduction = 0;
                const bonusMatch = expense.note?.match(/Bonus:\s+(\d+)/);
                if (bonusMatch && bonusMatch[1])
                    bonus = parseInt(bonusMatch[1]);

                const deductionMatch =
                    expense.note?.match(/Deduction:\s+(\d+)/);
                if (deductionMatch && deductionMatch[1])
                    deduction = parseInt(deductionMatch[1]);

                const correctFinalPaid = expectedRounded + bonus - deduction;

                if (expense.amount !== correctFinalPaid) {
                    const staffName = (staff as any).name || staff.staffId;
                    console.log(
                        `[FIX] ${staffName}: Absent ${totalAbsentDays}, Unemp ${unemployedDays} | Amount ${expense.amount} -> ${correctFinalPaid}`,
                    );
                    expense.amount = correctFinalPaid;
                    await expense.save();
                    modifiedExpenses++;
                }
            }

            if (
                newAbsentsForThisStaff > 0 ||
                (expense && expense.isModified('amount'))
            ) {
                modifiedEmployees++;
            }
        }

        console.log(`\n=== FINAL FIX REPORT ===`);
        console.log(`Employees Processed: ${staffs.length}`);
        console.log(
            `Employees Fixed (Record or Expense): ${modifiedEmployees}`,
        );
        console.log(`Missing Absent Punches Generated: ${upsertedAttendances}`);
        console.log(`Expense Payouts Corrected: ${modifiedExpenses}`);
        console.log(`========================\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error in fixAllFebruaryData:', error);
        process.exit(1);
    }
}

fixAllFebruaryData();
