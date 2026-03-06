import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { eachDayOfInterval } from 'date-fns';
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
        await mongoose.connect(uri as string, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('Connected to office DB for complete February 2026 fix.');

        const year = 2026;
        const monthNum = 2; // February 2026
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

        // Let's get all active staffs and any that were active in Feb
        const staffs = await StaffModel.find({
            $or: [{ status: 'active' }, { exitDate: { $gte: startDate } }],
        });

        console.log(
            `Found ${staffs.length} relevant staff members to check for February.`,
        );

        const salaryCategory = await ExpenseCategoryModel.findOne({
            name: /^Salary/i,
        });
        if (!salaryCategory) {
            console.log('No Salary category found, aborting.');
            return process.exit(1);
        }

        const daysInMonth = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

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

            // Get explicitly existing attendance records
            const existingAttendance = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            // Expected dates map
            const expectedWorkDates: Date[] = [];
            if (shift) {
                daysInMonth.forEach((day) => {
                    if (shift.workDays.includes(day.getDay() as any)) {
                        expectedWorkDates.push(day);
                    }
                });
            }

            // Unemployed days (outside join/exit bounds)
            let unemployedDays = 0;
            const joinDate = staff.joinDate ? new Date(staff.joinDate) : null;
            const exitDate = staff.exitDate ? new Date(staff.exitDate) : null;

            daysInMonth.forEach((day) => {
                const isBeforeJoin = joinDate && day < joinDate;
                const isAfterExit = exitDate && day > exitDate;
                if (isBeforeJoin || isAfterExit) {
                    unemployedDays++;
                }
            });

            // Find missing punch dates and CREATE literal "absent" records for them.
            // This is crucial because Grace UI looks at actual absent records for grace eligibility.
            let missingPunches = 0;
            const todayUTC = new Date(
                Date.UTC(
                    new Date().getUTCFullYear(),
                    new Date().getUTCMonth(),
                    new Date().getUTCDate(),
                ),
            );

            const missingDatesToCreate: Date[] = [];

            if (shift) {
                expectedWorkDates.forEach((day) => {
                    if (day > todayUTC) return; // Future

                    const isBeforeJoin = joinDate && day < joinDate;
                    const isAfterExit = exitDate && day > exitDate;
                    if (isBeforeJoin || isAfterExit) return;

                    const hasRecord = existingAttendance.some(
                        (a) => new Date(a.date).getTime() === day.getTime(),
                    );

                    if (!hasRecord) {
                        missingPunches++;
                        missingDatesToCreate.push(day);
                    }
                });
            }

            // Insert literal missing records into the database
            for (const missingDate of missingDatesToCreate) {
                if (!shift?._id) continue;

                await AttendanceDayModel.create({
                    staffId: staff._id,
                    shiftId: shift._id,
                    date: missingDate,
                    status: 'absent',
                    isAutoAbsent: true,
                    notes: '[Auto Generated Missing Punch]',
                });
                upsertedAttendances++;
            }

            // Calculate actual total deduction
            const literalAbsentDays = existingAttendance.filter(
                (a) => a.status === 'absent',
            ).length;
            const finalAbsentDays = literalAbsentDays + missingPunches;

            // Calculate final expected paycheck
            const staffSalary = staff.salary || 0;
            const perDaySalary = staffSalary / 30;
            const serverDeduction =
                (finalAbsentDays + unemployedDays) * perDaySalary;
            const expectedPayable = Math.max(0, staffSalary - serverDeduction);
            const expectedRounded = Math.round(expectedPayable);

            // Fetch the payment record if one exists
            const expense = await ExpenseModel.findOne({
                categoryId: salaryCategory._id,
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            if (expense) {
                // Determine bonus and deductions from original note
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
                    // Try to fetch user name or fallback to staff id
                    // Cast to any to get around User populate missing type check here
                    const staffName = (staff as any).name || staff.staffId;
                    console.log(
                        `Fixing payment for ${staffName} | Base: ${expectedRounded} | Fix: ${expense.amount} -> ${correctFinalPaid}`,
                    );
                    expense.amount = correctFinalPaid;
                    await expense.save();
                    modifiedExpenses++;
                }
            }

            if (
                missingDatesToCreate.length > 0 ||
                (expense && expense.isModified('amount'))
            ) {
                modifiedEmployees++;
            }
        }

        console.log(`\n=== FIX REPORT ===`);
        console.log(`Employees Processed/Fixed: ${modifiedEmployees}`);
        console.log(`Missing Absent Punches Generated: ${upsertedAttendances}`);
        console.log(`Expense Payouts Corrected: ${modifiedExpenses}`);
        console.log(`==================\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error fixing Feb data:', error);
        process.exit(1);
    }
}

fixAllFebruaryData();
