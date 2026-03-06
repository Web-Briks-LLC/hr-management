import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ShiftModel from '../models/shift.model.js';

dotenv.config();

const uri = process.env.MONGO_URI || process.env.OFFICE_MONGO_URI;

const manualTargets = [
    { name: 'Asaduzzaman Didar', targetPresent: 15, targetAbsent: 5 },
    { name: 'Md Moni mia', targetPresent: 18, targetAbsent: 6 },
];

async function forceExactCounts() {
    try {
        if (!uri) {
            console.error('OFFICE_MONGO_URI not found');
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log('Connected to DB for exact count override.');

        const year = 2026;

        // Strictly define UTC range for Feb 2026
        const startDate = new Date(Date.UTC(year, 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, 1, 28, 23, 59, 59, 999));

        // Manually generate days to avoid date-fns timezone interpretation
        const daysInMonth: Date[] = [];
        for (let d = 1; d <= 28; d++) {
            daysInMonth.push(new Date(Date.UTC(year, 1, d)));
        }

        const salaryCategory = await ExpenseCategoryModel.findOne({
            name: /^Salary/i,
        });
        if (!salaryCategory) {
            console.error('Salary category not found');
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

            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id,
                isActive: true,
            });
            const shift = shiftAssignment
                ? await ShiftModel.findById(shiftAssignment.shiftId)
                : null;

            if (!shift) {
                console.log(`[SKIP] Shift not found for ${target.name}`);
                continue;
            }

            console.log(`\nProcessing ${target.name}:`);
            console.log(
                `  Target: Present ${target.targetPresent}, Absent ${target.targetAbsent}`,
            );

            const workingDates = daysInMonth.filter((d) =>
                shift.workDays.includes(d.getUTCDay() as any),
            );
            console.log(`  Total Working Days: ${workingDates.length}`);

            if (
                workingDates.length !==
                target.targetPresent + target.targetAbsent
            ) {
                console.log(
                    `  [WARN] Working days mismatch! Expected ${target.targetPresent + target.targetAbsent}, Found ${workingDates.length}`,
                );
            }

            // 1. Clear existing attendance for this month to start fresh and avoid count drama
            await AttendanceDayModel.deleteMany({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            // 2. Create exact records
            let presentCount = 0;
            let absentCount = 0;

            for (const date of workingDates) {
                const dateStr = date.toISOString().split('T')[0] as string;
                let status: string;

                if (presentCount < target.targetPresent) {
                    status = 'present';
                    presentCount++;
                } else if (absentCount < target.targetAbsent) {
                    status = 'absent';
                    absentCount++;
                } else {
                    // Extra working day? Default to present
                    status = 'present';
                    presentCount++;
                }

                await AttendanceDayModel.create({
                    staffId: staff._id,
                    shiftId: shift._id,
                    date: new Date(dateStr + 'T00:00:00.000Z'),
                    status,
                    notes: `[Manual Exact Override: ${status}]`,
                });
            }

            console.log(
                `  - Created ${presentCount} present and ${absentCount} absent records.`,
            );

            // 3. Update salary expense
            // Unemployed days should be 0 because we are forcing exact working day counts
            // But let's check correctly per policy (base - (absent + unemployed) * perDay)
            // Since we matched working days, let's see if there are any outside days
            // For these 3, we'll assume they worked all working days assigned (either present or absent)
            let unemployedCount = 0;
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

            daysInMonth.forEach((d) => {
                const dStr = d.toISOString().split('T')[0] as string;
                if ((joinStr && dStr < joinStr) || (exitStr && dStr > exitStr))
                    unemployedCount++;
            });

            const perDay = (staff.salary || 0) / 30;
            const expectedBase = Math.max(
                0,
                (staff.salary || 0) - (absentCount + unemployedCount) * perDay,
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
                    `  - Salary updated: ${expense.amount} -> ${finalPaid} (Base: ${expectedRounded}, Unemp: ${unemployedCount}, Absent: ${absentCount})`,
                );
                expense.amount = finalPaid;
                expense.note =
                    (expense.note || '') + ' [Exact Count Override Update]';
                await expense.save();
            } else {
                console.log(`  - No salary expense found to update.`);
            }
        }

        console.log('\nExact count override complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

forceExactCounts();
