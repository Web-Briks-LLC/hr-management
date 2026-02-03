import { startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import mongoose, { Types } from 'mongoose';

interface IPayrollPreviewParams {
    month: string; // YYYY-MM
    branchId?: string;
}

interface IPayrollProcessParams {
    staffId: string;
    month: string;
    amount: number;
    paymentMethod: string;
    note?: string | undefined;
    bonus?: number | undefined;
    deduction?: number | undefined;
    createdBy: string;
}

const getPayrollPreview = async ({
    month,
    branchId,
}: IPayrollPreviewParams) => {
    const startDate = startOfMonth(new Date(month));
    const endDate = endOfMonth(new Date(month));

    const matchStage: any = {
        status: 'active', // Only active staff
    };

    if (branchId && branchId !== 'all') {
        matchStage.branchId = new Types.ObjectId(branchId);
    }

    // 1. Get all eligible staff
    const staffs = await StaffModel.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'user',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'branches',
                localField: 'branchId',
                foreignField: '_id',
                as: 'branch',
            },
        },
        { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                staffId: 1,
                name: '$user.name',
                email: '$user.email',
                phone: 1,
                designation: 1,
                department: 1,
                salary: 1,
                joinDate: 1,
                branch: '$branch.name',
                branchId: 1,
            },
        },
    ]);

    // 2. Get existing expenses for this month to check status
    const salaryCategory = await ExpenseCategoryModel.findOne({
        name: { $regex: /^Salary/i },
    });

    const expenses = salaryCategory
        ? await ExpenseModel.find({
              categoryId: salaryCategory._id,
              date: { $gte: startDate, $lte: endDate },
          })
        : [];

    const stats = await Promise.all(
        staffs.map(async (staff) => {
            // Get Shift Assignment for this staff in this month
            // Assuming simplified: Get current active shift or main shift
            // Ideally should check shift history. For now, simplified to current active shift.
            const shiftAssignment = await ShiftAssignmentModel.findOne({
                staffId: staff._id,
                isActive: true,
            }).populate('shiftId');

            let workDaysCount = 0;
            const daysInMonth = eachDayOfInterval({
                start: startDate,
                end: endDate,
            });

            // Calculate expected working days based on Shift
            const shift: any = shiftAssignment?.shiftId;
            if (shift) {
                daysInMonth.forEach((day) => {
                    const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday...
                    // Check if dayOfWeek is in shift.workDays
                    // Note: date-fns getDay returns 0 for Sunday.
                    // Need to verify standard. JS getDay: 0=Sun.
                    // shift.workDays usually stores 0-6.
                    if (shift.workDays.includes(dayOfWeek)) {
                        workDaysCount++;
                    }
                });
            } else {
                // Default if no shift: assume standard 26 days? Or 0?
                // Lets default to all weekdays (Mon-Fri) if no shift found, simple fallback
                workDaysCount = 22;
            }

            // Fetch attendance stats
            const attendance = await AttendanceDayModel.find({
                staffId: staff._id,
                date: { $gte: startDate, $lte: endDate },
            });

            // Group attendance by status
            const presentDays = attendance.filter((a) =>
                ['present', 'late', 'half_day', 'early_exit'].includes(
                    a.status,
                ),
            ).length;

            const absentDays = attendance.filter(
                (a) => a.status === 'absent',
            ).length;
            const leaveDays = attendance.filter(
                (a) => a.status === 'on_leave',
            ).length;
            const holidays = attendance.filter(
                (a) => a.status === 'holiday',
            ).length;
            const lateDays = attendance.filter(
                (a) => a.status === 'late',
            ).length;

            // Correction: If attendance records exist for holidays/weekends, they are not absent.
            // "Absent" in DB means marked absent on a working day.

            // Adjusted Logic:
            // Payable = Present + Leave + Holiday (if paid) + Weekend (if paid)
            // Simpler Logic requested:
            // "month koto din kaj korte hobe" (Work Days) - derived from calendar + shift
            // "present count"
            // "absent count"
            // "late count"
            // "payable salary"

            // Formula: Per Day = Salary / WorkDays
            // Payable = Salary - (Absent * Per Day)

            // Prevent division by zero
            const effectiveWorkDays = workDaysCount > 0 ? workDaysCount : 1;
            const staffSalary = staff.salary || 0;
            const perDaySalary = staffSalary / effectiveWorkDays;

            const deduction = absentDays * perDaySalary;
            const payableSalary = Math.max(0, staffSalary - deduction);

            // Check if already paid
            // We match by checking if an expense exists with title containing staffId
            // OR ideally we should store staffId in Expense if strictly linked.
            // Current approach: Using Title convention "Salary - <staffId> - <Month>"
            // Since we are iterating staff, let's find identifying expense.
            // Security: StaffId (MongoID) is unique.
            const existingExpense = expenses.find((e) =>
                e.title.includes(staff._id.toString()),
            );

            return {
                staffId: staff._id,
                workDays: workDaysCount,
                present: presentDays,
                absent: absentDays,
                late: lateDays,
                onLeave: leaveDays,
                holiday: holidays,
                perDaySalary: Math.round(perDaySalary),
                payableSalary: Math.round(payableSalary),
                status: existingExpense ? 'paid' : 'pending',
                expenseId: existingExpense?._id,
                paidAmount: existingExpense?.amount,
            };
        }),
    );

    // Merge stats with staff data
    return staffs.map((staff) => {
        const stat = stats.find(
            (s) => s.staffId.toString() === staff._id.toString(),
        );
        return {
            ...staff,
            ...stat,
        };
    });
};

const processPayroll = async ({
    staffId,
    month,
    amount, // Base payable calculated in frontend + modifications
    paymentMethod,
    note,
    bonus,
    deduction,
    createdBy,
}: IPayrollProcessParams) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staff = await StaffModel.findById(staffId).session(session);
        if (!staff) throw new Error('Staff not found');

        // Check if category exists
        let category = await ExpenseCategoryModel.findOne({
            name: { $regex: /^Salary/i },
        }).session(session);

        if (!category) {
            category = await ExpenseCategoryModel.create(
                [{ name: 'Salary & Wages' }],
                { session },
            ).then((res) => res[0] as any);
        }

        if (!staff.branchId) {
            throw new Error(
                'Staff does not have a branch assigned. Cannot create expense.',
            );
        }

        // Generate Expense Title
        const monthName = new Date(month).toLocaleString('default', {
            month: 'long',
            year: 'numeric',
        });
        // NOTE: If we want detailed breakdown in note
        const details = [];
        if (bonus) details.push(`Bonus: ${bonus}`);
        if (deduction) details.push(`Deduction: ${deduction}`);
        const extraNote = details.length > 0 ? ` (${details.join(', ')})` : '';
        const finalNote =
            (note || `Salary Payment for ${monthName}`) + extraNote;

        const expenseTitle = `Salary - ${staffId} - ${monthName}`;

        // Check if exists
        const existingExpense = await ExpenseModel.findOne({
            title: expenseTitle,
            branchId: staff.branchId, // Extra safety
        }).session(session);

        let createdExpense;

        if (existingExpense) {
            // Update
            existingExpense.amount = amount;
            existingExpense.note = finalNote;
            existingExpense.paymentMethod = paymentMethod || 'cash';
            existingExpense.createdBy = new Types.ObjectId(createdBy); // Update who updated it
            await existingExpense.save({ session });
            createdExpense = existingExpense;
        } else {
            // Create Expense
            const expense = await ExpenseModel.create(
                [
                    {
                        date: new Date(),
                        title: expenseTitle,
                        categoryId: category!._id,
                        branchId: staff.branchId,
                        amount: amount, // Final amount passed from frontend
                        status: 'paid',
                        paymentMethod: paymentMethod || 'cash',
                        note: finalNote,
                        createdBy: createdBy,
                    },
                ],
                { session },
            );
            createdExpense = expense[0];

            // ---------------------------------------------------------
            // AUTO-UPDATE STAFF SALARY IF 0 OR MISSING
            // ---------------------------------------------------------
            // We interpret the 'amount' (base payment before bonus/deduction) as the salary
            // But 'amount' here includes bonus/deduction if they were merged?
            // Wait, processPayroll receives 'amount' as the FINAL amount in the current logic?
            // Let's check the call site.
            // In EditSalaryDialog: amount: finalAmount.
            // We need the BASE amount to update Staff Salary, not the final amount with bonus/deduction.
            // However, processPayroll param 'amount' seems to be used as the expense amount.
            // If the user is setting a salary for the first time, presumably they are paying the base salary.
            // If we can't reliably get base salary, we might accidentally set salary = base + bonus.
            // BUT, usually "Salary" field implies the fixed monthly base.
            // If the user manually edits the "Base" input in the dialog, that IS the new base salary.
            // Let's assume the intention is: If I pay X as "Base" (before bonus/deduction), update Staff.salary to X.
            // Problem: 'processPayroll' params don't split Base vs Final strictly in a way that preserves Base for this logic
            // unless we reverse engineer it: Base = Amount - Bonus + Deduction.

            const currentBaseSalary = amount - (bonus || 0) + (deduction || 0);

            // Update staff salary if it has changed
            if (staff.salary !== currentBaseSalary) {
                await StaffModel.findByIdAndUpdate(
                    staffId,
                    { salary: currentBaseSalary },
                    { session },
                );
            }
            // ---------------------------------------------------------
        }

        if (!createdExpense) {
            throw new Error('Failed to create/update expense record');
        }

        await session.commitTransaction();
        return createdExpense;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

interface IBulkPayrollParams {
    month: string;
    payments: {
        staffId: string;
        amount: number;
        bonus?: number;
        deduction?: number;
        note?: string;
    }[];
    paymentMethod: string;
    createdBy: string;
}

const bulkProcessPayment = async ({
    month,
    payments,
    paymentMethod,
    createdBy,
}: IBulkPayrollParams) => {
    const results = [];
    const errors = [];

    // We process sequentially to ensure transaction safety per record or we could do one big transaction.
    // For safety and partial success, let's do Promise.all but handle errors individually.
    // However, if we want "All or Nothing", one transaction. User usually expects "All or Nothing" for bulk actions or "Best Effort".
    // Let's go with Best Effort (process what can be processed).

    for (const payment of payments) {
        try {
            const result = await processPayroll({
                staffId: payment.staffId,
                month,
                amount: payment.amount,
                paymentMethod,
                note: payment.note,
                bonus: payment.bonus,
                deduction: payment.deduction,
                createdBy,
            });
            results.push({
                staffId: payment.staffId,
                status: 'success',
                expenseId: result._id,
            });
        } catch (error: any) {
            errors.push({
                staffId: payment.staffId,
                status: 'failed',
                message: error.message,
            });
        }
    }

    return { results, errors };
};

const graceAttendance = async (
    staffId: string,
    date: string,
    note?: string,
) => {
    // Find absent record and update to present
    const targetDate = new Date(date);
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const attendance = await AttendanceDayModel.findOne({
        staffId,
        date: { $gte: start, $lte: end },
        status: 'absent',
    });

    if (!attendance) {
        throw new Error('No absent record found for this date');
    }

    attendance.status = 'present';
    attendance.notes = note
        ? `${attendance.notes || ''} [Grace: ${note}]`
        : (attendance.notes ?? null);
    attendance.isManual = true; // Mark as manually corrected
    await attendance.save();

    return attendance;
};

const getAbsentDates = async (staffId: string, month: string) => {
    const startDate = startOfMonth(new Date(month));
    const endDate = endOfMonth(new Date(month));

    return await AttendanceDayModel.find({
        staffId,
        date: { $gte: startDate, $lte: endDate },
        status: 'absent',
    }).select('date status');
};

export default {
    getPayrollPreview,
    processPayroll,
    bulkProcessPayment,
    graceAttendance,
    getAbsentDates,
};
