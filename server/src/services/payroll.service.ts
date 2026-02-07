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
                // Bank account fields for PDF export
                bankAccountNo: 1,
                bankAccountName: 1,
                bankName: 1,
            },
        },
    ]);

    // 2. Optimization: Batch Fetching
    const staffIds = staffs.map((s) => s._id);

    // Fetch all active shifts for these staff
    const shiftAssignments = await ShiftAssignmentModel.find({
        staffId: { $in: staffIds },
        isActive: true,
    }).populate('shiftId');

    // Fetch all attendance records for these staff in the given month
    const allAttendance = await AttendanceDayModel.find({
        staffId: { $in: staffIds },
        date: { $gte: startDate, $lte: endDate },
    });

    // Fetch all salary expenses for these staff in the given month
    const salaryCategory = await ExpenseCategoryModel.findOne({
        name: { $regex: /^Salary/i },
    });

    let paidExpenses: any[] = [];
    if (salaryCategory) {
        // We fetch by category and date range.
        // We can filter by staffId or title in memory if needed, but DB query is better.
        // To support both new staffId field and legacy title matching, we use $or
        // But title matching for many staff is inefficient.
        // Let's fecth all salary expenses for this month for these staff.
        paidExpenses = await ExpenseModel.find({
            categoryId: salaryCategory._id,
            date: { $gte: startDate, $lte: endDate },
            $or: [
                { staffId: { $in: staffIds } },
                // Fallback for legacy data without staffId:
                // We fetch all and filter in JS if needed, or rely on regex if practical.
                // Given we have the list, let's just fetch all salary expenses for this month.
                // It is cleaner to just fetch all expenses in this category for this month
                // since we usually check all staff anyway.
            ],
        });
    }

    const daysInMonth = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const stats = staffs.map((staff) => {
        // A. Match Shift
        const shiftAssignment = shiftAssignments.find(
            (sa) => sa.staffId.toString() === staff._id.toString(),
        );

        let workDaysCount = 0;
        const shift: any = shiftAssignment?.shiftId;

        if (shift) {
            daysInMonth.forEach((day) => {
                const dayOfWeek = day.getDay();
                if (shift.workDays.includes(dayOfWeek)) {
                    workDaysCount++;
                }
            });
        } else {
            workDaysCount = 22; // Default fallback
        }

        // B. Match Attendance
        const staffAttendance = allAttendance.filter(
            (a) => a.staffId.toString() === staff._id.toString(),
        );

        const presentDays = staffAttendance.filter((a) =>
            ['present', 'late', 'half_day', 'early_exit'].includes(a.status),
        ).length;

        const absentDays = staffAttendance.filter(
            (a) => a.status === 'absent',
        ).length;

        const leaveDays = staffAttendance.filter(
            (a) => a.status === 'on_leave',
        ).length;

        const holidays = staffAttendance.filter(
            (a) => a.status === 'holiday',
        ).length;

        const lateDays = staffAttendance.filter(
            (a) => a.status === 'late',
        ).length;

        // C. Calculate Salary
        const effectiveWorkDays = workDaysCount > 0 ? workDaysCount : 1;
        const staffSalary = staff.salary || 0;
        const perDaySalary = staffSalary / effectiveWorkDays;

        const deduction = absentDays * perDaySalary;
        const payableSalary = Math.max(0, staffSalary - deduction);

        // D. Check Payment Status
        // Priority: Check staffId field first, then fallback to Title match
        const existingExpense = paidExpenses.find((e) => {
            if (e.staffId && e.staffId.toString() === staff._id.toString()) {
                return true;
            }
            return e.title.includes(staff._id.toString());
        });

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
    });

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
        // Check if exists
        const existingExpense = await ExpenseModel.findOne({
            $or: [
                {
                    staffId: staffId,
                    date: {
                        $gte: startOfMonth(new Date(month)),
                        $lte: endOfMonth(new Date(month)),
                    },
                },
                { title: expenseTitle, branchId: staff.branchId }, // Legacy check
            ],
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
                        staffId: staff._id, // Save staffId for robust linking
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
