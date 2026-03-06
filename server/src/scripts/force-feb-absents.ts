import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { eachDayOfInterval } from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';

dotenv.config();

const uri = process.env.OFFICE_MONGO_URI;

const manualTargets = [
    { name: 'Asaduzzaman Didar', targetCount: 5 },
    { name: 'Md Moni mia', targetCount: 6 },
    { name: 'Ayat Rana', targetCount: 3 },
    { name: 'ABDUR RAHAMAN ARIF', targetCount: 22 },
];

async function forceManualAbsents() {
    try {
        if (!uri) {
            console.error('OFFICE_MONGO_URI not found');
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log('Connected to DB for manual absent override.');

        const year = 2026;
        const monthNum = 2; // February
        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
        const daysInMonth = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        const salaryCategory = await ExpenseCategoryModel.findOne({
            name: /^Salary/i,
        });

        if (!salaryCategory) {
            console.error('FATAL: Salary category not found');
            process.exit(1);
        }

        for (const target of manualTargets) {
            const user = await mongoose.connection.collection('user').findOne({
                name: { $regex: new RegExp(target.name, 'i') },
            });

            if (!user) {
                console.log(`[SKIP] User not found: ${target.name}`);
                continue;
            }

            const staff = await StaffModel.findOne({ userId: user._id });
            if (!staff) {
                console.log(`[SKIP] Staff record not found: ${target.name}`);
                continue;
            }

            console.log(
                `\nProcessing ${target.name} (Forcing ${target.targetCount} Absents)`,
            );

            // 1. Unemployment check
            let unemployedDays = 0;
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

            daysInMonth.forEach((day) => {
                const dayStr = day.toISOString().split('T')[0] as string;
                if (
                    (joinStr && dayStr < joinStr) ||
                    (exitStr && dayStr > exitStr)
                )
                    unemployedDays++;
            });

            // 2. Clear then Set exactly N absent records
            // We'll prioritize days that are currently 'absent' or 'missing'
            const existingAttendance = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id,
                isActive: true,
            });
            const shift = shiftAssignment
                ? await ShiftModel.findById(shiftAssignment.shiftId)
                : null;

            if (!shift) {
                console.log(
                    `  - No shift found for ${target.name}. Skipping auto-attendance creation.`,
                );
                continue;
            }

            const absentRecords = existingAttendance.filter(
                (a) => a.status === 'absent',
            );

            if (absentRecords.length > target.targetCount) {
                console.log(
                    `  - Already has ${absentRecords.length} absents, which is more than target. Not deleting for safety.`,
                );
            } else if (absentRecords.length < target.targetCount) {
                // We need more absents
                let needed = target.targetCount - absentRecords.length;
                console.log(
                    `  - Currently has ${absentRecords.length} absents. Need ${needed} more.`,
                );

                const existingDates = new Set(
                    existingAttendance.map(
                        (a) =>
                            new Date(a.date)
                                .toISOString()
                                .split('T')[0] as string,
                    ),
                );

                for (const d of daysInMonth) {
                    if (needed <= 0) break;
                    const dStr = d.toISOString().split('T')[0] as string;

                    // Prioritize missing working days
                    if (
                        shift.workDays.includes(d.getUTCDay() as any) &&
                        !existingDates.has(dStr)
                    ) {
                        // Was staff employed?
                        if (
                            (!joinStr || dStr >= joinStr) &&
                            (!exitStr || dStr <= exitStr)
                        ) {
                            await AttendanceDayModel.create({
                                staffId: staff._id,
                                shiftId: shift._id,
                                date: new Date(dStr + 'T00:00:00.000Z'),
                                status: 'absent',
                                isAutoAbsent: true,
                                notes: '[Manual Forced Absent]',
                            });
                            needed--;
                            console.log(`  - Created absent for ${dStr}`);
                        }
                    }
                }

                // If still needed, override present days (last resort)
                if (needed > 0) {
                    const presentRecords = existingAttendance.filter(
                        (a) => a.status !== 'absent',
                    );
                    for (const pr of presentRecords) {
                        if (needed <= 0) break;
                        pr.status = 'absent';
                        pr.notes =
                            (pr.notes || '') +
                            ' [Converted to Absent by manual script]';
                        await pr.save();
                        needed--;
                        console.log(
                            `  - Converted ${new Date(pr.date).toISOString().split('T')[0] as string} to absent.`,
                        );
                    }
                }
            }

            // 3. Recalculate and update Expense payout
            const finalAttendance = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });
            const finalAbsentCount = finalAttendance.filter(
                (a) => a.status === 'absent',
            ).length;

            const perDay = (staff.salary || 0) / 30;
            const expectedBase = Math.max(
                0,
                (staff.salary || 0) -
                    (finalAbsentCount + unemployedDays) * perDay,
            );
            const expectedRounded = Math.round(expectedBase);

            const expense = await ExpenseModel.findOne({
                staffId: staff._id as any,
                categoryId: salaryCategory._id as any,
                date: { $gte: startDate, $lte: endDate } as any,
            });

            if (expense) {
                let bonus = 0;
                let deduction = 0;
                const bonusMatch = expense.note?.match(/Bonus:\s+(\d+)/);
                if (bonusMatch) bonus = parseInt(bonusMatch[1] as string);
                const deductionMatch =
                    expense.note?.match(/Deduction:\s+(\d+)/);
                if (deductionMatch)
                    deduction = parseInt(deductionMatch[1] as string);

                const finalPaid = expectedRounded + bonus - deduction;
                console.log(
                    `  - Updating Expense: ${expense.amount} -> ${finalPaid} (Absent: ${finalAbsentCount}, Unemp: ${unemployedDays})`,
                );
                expense.amount = finalPaid;
                await expense.save();
            }
        }

        console.log('\nFinished forcing absents.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

forceManualAbsents();
