import { startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import StaffModel from "../models/staff.model.js";
import AttendanceDayModel from "../models/attendance-day.model.js";
import ShiftAssignmentModel from "../models/shift-assignment.model.js";
import ExpenseModel from "../models/expense.model.js";
import ExpenseCategoryModel from "../models/expense-category.model.js";
import OvertimeModel from "../models/overtime.model.js";
import mongoose, { Types } from "mongoose";

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
    // Parse year and month from 'YYYY-MM' format
    const parts = month.split("-");
    const year = parseInt(parts[0]!, 10);
    const monthNum = parseInt(parts[1]!, 10);
    // Create UTC dates to avoid timezone issues
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999)); // Day 0 of next month = last day of current month

    const matchStage: any = {
        status: "active", // Only active staff
    };

    if (branchId && branchId !== "all") {
        matchStage.branchId = new Types.ObjectId(branchId);
    }

    // 1. Get all eligible staff
    const staffs = await StaffModel.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "user",
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "branches",
                localField: "branchId",
                foreignField: "_id",
                as: "branch",
            },
        },
        { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                staffId: 1,
                name: "$user.name",
                email: "$user.email",
                phone: 1,
                designation: 1,
                department: 1,
                salary: 1,
                joinDate: 1,
                branch: "$branch.name",
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
    }).populate("shiftId");

    // Fetch all attendance records for these staff in the given month
    const allAttendance = await AttendanceDayModel.find({
        staffId: { $in: staffIds },
        date: { $gte: startDate, $lte: endDate },
    });

    // Fetch all approved overtime records for these staff in the given month
    const approvedOvertime = await OvertimeModel.find({
        staffId: { $in: staffIds },
        date: { $gte: startDate, $lte: endDate },
        status: "approved",
    });

    // Fetch all salary and overtime expenses for these staff in the given month
    const expenseCategories = await ExpenseCategoryModel.find({
        name: { $in: [/^Salary/i, /^Overtime/i] },
    });

    const salaryCategory = expenseCategories.find((c) =>
        /^Salary/i.test(c.name),
    );
    const overtimeCategory = expenseCategories.find((c) =>
        /^Overtime/i.test(c.name),
    );

    const categoryIds = expenseCategories.map((c) => c._id);

    let paidExpenses: any[] = [];
    if (categoryIds.length > 0) {
        // We fetch by category and date range.
        const targetMonthName = new Date(
            Date.UTC(year, monthNum - 1, 1),
        ).toLocaleString("default", {
            month: "long",
            year: "numeric",
        });

        paidExpenses = await ExpenseModel.find({
            categoryId: { $in: categoryIds },
            $or: [
                // 1. Standard: Match by Date (Correctly dated record)
                {
                    date: { $gte: startDate, $lte: endDate },
                    staffId: { $in: staffIds },
                },
                // 2. Fallback: Match by Title containing "Month Year" (e.g. "January 2026")
                {
                    title: { $regex: targetMonthName, $options: "i" },
                    staffId: { $in: staffIds },
                },
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
            ["present", "late", "half_day", "early_exit"].includes(a.status),
        ).length;

        const absentDays = staffAttendance.filter(
            (a) => a.status === "absent",
        ).length;

        const leaveDays = staffAttendance.filter(
            (a) => a.status === "on_leave",
        ).length;

        const holidays = staffAttendance.filter(
            (a) => a.status === "holiday",
        ).length;

        const lateDays = staffAttendance.filter(
            (a) => a.status === "late",
        ).length;

        // C. Calculate Salary
        // Per day salary = Salary / 30 (fixed)
        // Payable = Salary - (Absent × Per day)
        const staffSalary = staff.salary || 0;
        const perDaySalary = staffSalary / 30;

        const deduction = absentDays * perDaySalary;
        const payableSalary = Math.max(0, staffSalary - deduction);

        // D. Overtime Calculation
        // const attendanceOt = staffAttendance.reduce((sum, a) => sum + (a.otMinutes || 0), 0);

        const staffApprovedOvertime = approvedOvertime.filter(
            (ot) => ot.staffId.toString() === staff._id.toString(),
        );
        const approvedOt = staffApprovedOvertime.reduce(
            (sum, ot) => sum + (ot.durationMinutes || 0),
            0,
        );

        // Sum both sources?
        // User requested strictly data from "Overtime Management".
        // We use approvedOt as the source of truth for payment.
        // We ignore attendanceOt (auto-calc) to prevent unapproved/duplicate payment.
        const otMinutes = approvedOt;
        let otPayable = staffAttendance.reduce(
            (sum, a) => sum + (a.otAmount || 0),
            0,
        );

        // Fallback: Calculate OT amount if missing but minutes exist
        if (otPayable === 0 && otMinutes > 0) {
            // Standard calculation: (Salary / 30 days / 8 hours) * OT Hours
            const hourlyRate = staffSalary / 30 / 8;
            otPayable = (otMinutes / 60) * hourlyRate;
        }

        // E. Check Payment Status (Salary)
        const salaryExpense = paidExpenses.find((e) => {
            // Robust check: Match Staff ID AND Category (if available) or Title
            const isSalaryCategory =
                salaryCategory &&
                e.categoryId.toString() === salaryCategory._id.toString();
            // Fallback for legacy data if categoryId is missing? (Unlikely with strict schema).
            // But let's fallback to Title check if needed, though Category is safer.
            // Title check:
            const isSalaryTitle =
                e.title.includes("Salary") || !e.title.includes("Overtime"); // Default to salary if not OT

            if (e.staffId && e.staffId.toString() === staff._id.toString()) {
                return isSalaryCategory || isSalaryTitle;
            }
            // Very legacy title match
            return (
                e.title.includes(staff._id.toString()) &&
                (isSalaryCategory || isSalaryTitle)
            );
        });

        // F. Check Payment Status (Overtime)
        const otExpense = paidExpenses.find((e) => {
            const isOtCategory =
                overtimeCategory &&
                e.categoryId.toString() === overtimeCategory._id.toString();
            const isOtTitle = e.title.includes("Overtime");

            if (e.staffId && e.staffId.toString() === staff._id.toString()) {
                return isOtCategory || isOtTitle;
            }
            return (
                e.title.includes(staff._id.toString()) &&
                (isOtCategory || isOtTitle)
            );
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
            status: salaryExpense ? "paid" : "pending",
            expenseId: salaryExpense?._id,
            paidAmount: salaryExpense?.amount,
            // Overtime Stats
            otMinutes,
            otPayable: Math.round(otPayable),
            otStatus: otExpense ? "paid" : "pending",
            otPaidAmount: otExpense?.amount || 0,
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

interface IPayrollProcessParams {
    staffId: string;
    month: string;
    amount: number;
    paymentMethod: string;
    note?: string | undefined;
    bonus?: number | undefined;
    deduction?: number | undefined;
    createdBy: string;
    paymentType?: "salary" | "overtime";
}

const processPayroll = async ({
    staffId,
    month,
    amount, // Base payable calculated in frontend + modifications
    paymentMethod,
    note,
    bonus,
    deduction,
    createdBy,
    paymentType = "salary",
}: IPayrollProcessParams) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staff = await StaffModel.findById(staffId).session(session);
        if (!staff) throw new Error("Staff not found");

        // Determine Category Name based on Payment Type
        const categoryName =
            paymentType === "overtime" ? "Overtime" : "Salary & Wages";
        const categoryRegex =
            paymentType === "overtime" ? /^Overtime/i : /^Salary/i;

        // Check if category exists
        let category = await ExpenseCategoryModel.findOne({
            name: { $regex: categoryRegex },
        }).session(session);

        if (!category) {
            category = await ExpenseCategoryModel.create(
                [{ name: categoryName }],
                { session },
            ).then((res) => res[0] as any);
        }

        if (!staff.branchId) {
            throw new Error(
                "Staff does not have a branch assigned. Cannot create expense.",
            );
        }

        // Generate Expense Title
        const monthName = new Date(month).toLocaleString("default", {
            month: "long",
            year: "numeric",
        });
        // NOTE: If we want detailed breakdown in note
        const details = [];
        if (bonus) details.push(`Bonus: ${bonus}`);
        if (deduction) details.push(`Deduction: ${deduction}`);
        const extraNote = details.length > 0 ? ` (${details.join(", ")})` : "";
        const finalNote =
            (note || `${categoryName} Payment for ${monthName}`) + extraNote;

        const expenseTitle = `${
            paymentType === "overtime" ? "Overtime" : "Salary"
        } - ${staffId} - ${monthName}`;

        // Check if exists
        const existingExpense = await ExpenseModel.findOne({
            categoryId: category!._id, // Ensure we check within same category
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
            existingExpense.paymentMethod = paymentMethod || "cash";
            existingExpense.createdBy = new Types.ObjectId(createdBy); // Update who updated it
            await existingExpense.save({ session });
            createdExpense = existingExpense;
        } else {
            // Create Expense
            const expense = await ExpenseModel.create(
                [
                    {
                        date: endOfMonth(new Date(month)),
                        title: expenseTitle,
                        categoryId: category!._id,
                        branchId: staff.branchId,
                        staffId: staff._id, // Save staffId for robust linking
                        amount: amount, // Final amount passed from frontend
                        status: "paid",
                        paymentMethod: paymentMethod || "cash",
                        note: finalNote,
                        createdBy: createdBy,
                    },
                ],
                { session },
            );
            createdExpense = expense[0];

            // ---------------------------------------------------------
            // AUTO-UPDATE STAFF SALARY IF 0 OR MISSING (Only for Salary)
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

            if (paymentType === "salary") {
                const currentBaseSalary =
                    amount - (bonus || 0) + (deduction || 0);

                // Update staff salary if it has changed
                if (staff.salary !== currentBaseSalary) {
                    await StaffModel.findByIdAndUpdate(
                        staffId,
                        { salary: currentBaseSalary },
                        { session },
                    );
                }
            }
            // ---------------------------------------------------------
        }

        if (!createdExpense) {
            throw new Error("Failed to create/update expense record");
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
    paymentType?: "salary" | "overtime";
}

const bulkProcessPayment = async ({
    month,
    payments,
    paymentMethod,
    createdBy,
    paymentType = "salary",
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
                paymentType,
            });
            results.push({
                staffId: payment.staffId,
                status: "success",
                expenseId: result._id,
            });
        } catch (error: any) {
            errors.push({
                staffId: payment.staffId,
                status: "failed",
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
        status: "absent",
    });

    if (!attendance) {
        throw new Error("No absent record found for this date");
    }

    attendance.status = "present";
    attendance.notes = note
        ? `${attendance.notes || ""} [Grace: ${note}]`
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
        status: "absent",
    }).select("date status");
};

const undoPayroll = async (
    staffId: string,
    month: string,
    paymentType: "salary" | "overtime" = "salary",
) => {
    const startDate = startOfMonth(new Date(month));
    const endDate = endOfMonth(new Date(month));

    const categoryRegex =
        paymentType === "overtime" ? /^Overtime/i : /^Salary/i;

    // Find the expense category
    const category = await ExpenseCategoryModel.findOne({
        name: { $regex: categoryRegex },
    });

    if (!category) {
        throw new Error(
            `${
                paymentType === "overtime" ? "Overtime" : "Salary"
            } category not found`,
        );
    }

    const targetMonthName = new Date(startDate).toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const expense = await ExpenseModel.findOneAndDelete({
        staffId,
        categoryId: category._id,
        $or: [
            { date: { $gte: startDate, $lte: endDate } },
            { title: { $regex: targetMonthName, $options: "i" } },
        ],
    });

    if (!expense) {
        throw new Error("Payroll record not found for this month");
    }

    return { message: "Payroll payment undone successfully" };
};

export default {
    getPayrollPreview,
    processPayroll,
    bulkProcessPayment,
    graceAttendance,
    getAbsentDates,
    undoPayroll,
};
