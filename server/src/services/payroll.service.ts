import { eachDayOfInterval } from 'date-fns';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import OvertimeModel from '../models/overtime.model.js';
import { PayrollLockModel } from '../models/payroll-lock.model.js';
import SalaryAdjustmentLogModel from '../models/salary-adjustment-log.model.js';
import mongoose, { Types } from 'mongoose';

// ── Helpers ────────────────────────────────────────────────────────────

/** Parse "YYYY-MM" into UTC start/end of month */
function parseMonthRange(month: string) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr!, 10);
    const monthNum = parseInt(monthStr!, 10);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    return { year, monthNum, startDate, endDate };
}

/** Get human-readable month name from YYYY-MM */
function getMonthName(year: number, monthNum: number): string {
    return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
    });
}

// ── Payroll Preview ────────────────────────────────────────────────────

interface IPayrollPreviewParams {
    month: string; // YYYY-MM
    branchId?: string;
}

const getPayrollPreview = async ({
    month,
    branchId,
}: IPayrollPreviewParams) => {
    const { startDate, endDate } = parseMonthRange(month);

    const matchStage: any = { status: 'active' };
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
                exitDate: 1,
                branch: '$branch.name',
                branchId: 1,
                bank: 1,
            },
        },
    ]);

    // 2. Batch fetch all related data
    const staffIds = staffs.map((s) => s._id);

    const [
        shiftAssignments,
        allAttendance,
        approvedOvertime,
        expenseCategories,
    ] = await Promise.all([
        ShiftAssignmentModel.find({
            staffId: { $in: staffIds },
            $or: [
                { endDate: null },
                { endDate: { $gte: startDate } }
            ],
            startDate: { $lte: endDate }
        }).populate('shiftId'),
        AttendanceDayModel.find({
            staffId: { $in: staffIds },
            date: { $gte: startDate, $lte: endDate },
        }),
        OvertimeModel.find({
            staffId: { $in: staffIds },
            date: { $gte: startDate, $lte: endDate },
            status: 'approved',
        }),
        ExpenseCategoryModel.find({
            name: { $in: [/^Salary/i, /^Overtime/i] },
        }),
    ]);

    const salaryCategory = expenseCategories.find((c) =>
        /^Salary/i.test(c.name),
    );
    const overtimeCategory = expenseCategories.find((c) =>
        /^Overtime/i.test(c.name),
    );

    const categoryIds = expenseCategories.map((c) => c._id);

    let paidExpenses: any[] = [];
    if (categoryIds.length > 0) {
        // Strict matching: by staffId + categoryId + date range
        paidExpenses = await ExpenseModel.find({
            categoryId: { $in: categoryIds },
            staffId: { $in: staffIds },
            date: { $gte: startDate, $lte: endDate },
        });
    }

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    // 3. Calculate stats for each staff
    const stats = staffs.map((staff) => {
        const staffShiftAssignments = shiftAssignments.filter(
            (sa) => sa.staffId.toString() === staff._id.toString(),
        );

        // B. Attendance breakdown
        const staffAttendance = allAttendance.filter(
            (a) => a.staffId.toString() === staff._id.toString(),
        );

        const presentDays = staffAttendance.filter((a) =>
            ['present', 'late', 'half_day', 'early_exit'].includes(a.status),
        ).length;

        const literalAbsentDays = staffAttendance.filter(
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

        const halfDayDays = staffAttendance.filter(
            (a) => a.status === 'half_day',
        ).length;
        // Calculate Work Days, Missing Punches, and Unemployed Days by Day-by-Day Timeline
        let expectedWorkDates: Date[] = [];
        let workDaysCount = 0;
        let missingPunches = 0;
        let unemployedDays = 0;

        const todayUTCStr = new Date().toISOString().split('T')[0]!;
        const joinStr = staff.joinDate ? new Date(staff.joinDate).toISOString().split('T')[0] : null;
        const exitStr = staff.exitDate ? new Date(staff.exitDate).toISOString().split('T')[0] : null;

        daysInMonth.forEach((day: Date) => {
            const dayStr = day.toISOString().split('T')[0]!;
            
            // 1. Check if unemployed (strictly before join or after exit)
            const isBeforeJoin = joinStr && dayStr < joinStr;
            const isAfterExit = exitStr && dayStr > exitStr;
            if (isBeforeJoin || isAfterExit) {
                unemployedDays++;
                return; // Not a work day if unemployed
            }

            // 2. Resolve shift for this specific day
            const dayAssignment = (staffShiftAssignments as any[]).find((sa) => {
                const s = sa.startDate.toISOString().split('T')[0]!;
                const e = sa.endDate ? sa.endDate.toISOString().split('T')[0] : '9999-12-31';
                return dayStr >= s && dayStr <= e;
            });

            const shift: any = dayAssignment?.shiftId;
            if (!shift) return;

            // 3. Check if it's a work day
            if (shift.workDays.includes(day.getUTCDay())) {
                workDaysCount++;
                expectedWorkDates.push(day);

                // 4. Check for missing punch
                if (dayStr < todayUTCStr) {
                    const hasRecord = staffAttendance.some(
                        (a: any) => new Date(a.date).toISOString().split('T')[0] === dayStr,
                    );
                    if (!hasRecord) {
                        missingPunches++;
                    }
                }
            }
        });

        // Fallback: If NO shift assignments found for the entire month, use 22-day heuristic
        if (staffShiftAssignments.length === 0) {
            workDaysCount = 22;
        }

        const absentDays = literalAbsentDays + missingPunches;

        // C. Salary calculation (fixed /30 policy)
        const staffSalary = staff.salary || 0;
        const perDaySalary = staffSalary / 30;

        // Deduction formula: Absent days + Unemployed days
        const totalDeductionUnits = absentDays + unemployedDays;
        const deduction = totalDeductionUnits * perDaySalary;
        const payableSalary = Math.max(0, staffSalary - deduction);

        // D. Overtime from approved records only
        const staffApprovedOvertime = approvedOvertime.filter(
            (ot) => ot.staffId.toString() === staff._id.toString(),
        );
        const otMinutes = staffApprovedOvertime.reduce(
            (sum, ot) => sum + (ot.durationMinutes || 0),
            0,
        );
        const hourlyRate = staffSalary / 30 / 8;
        const otPayable = otMinutes > 0 ? (otMinutes / 60) * hourlyRate : 0;

        // E. Payment status — strict match by staffId + categoryId
        const salaryExpense = paidExpenses.find(
            (e) =>
                e.staffId?.toString() === staff._id.toString() &&
                salaryCategory &&
                e.categoryId.toString() === salaryCategory._id.toString(),
        );

        const otExpense = paidExpenses.find(
            (e) =>
                e.staffId?.toString() === staff._id.toString() &&
                overtimeCategory &&
                e.categoryId.toString() === overtimeCategory._id.toString(),
        );

        return {
            staffId: staff._id,
            workDays: workDaysCount,
            present: presentDays,
            absent: absentDays,
            late: lateDays,
            onLeave: leaveDays,
            holiday: holidays,
            halfDay: halfDayDays,
            unemployedDays,
            perDaySalary: Math.round(perDaySalary),
            payableSalary: Math.round(payableSalary),
            status: salaryExpense ? 'paid' : 'pending',
            expenseId: salaryExpense?._id,
            paidAmount: salaryExpense?.amount,
            otMinutes,
            otPayable: Math.round(otPayable),
            otStatus: otExpense ? 'paid' : 'pending',
            otPaidAmount: otExpense?.amount || 0,
        };
    });

    const results = staffs.map((staff) => {
        const stat = stats.find(
            (s) => s.staffId.toString() === staff._id.toString(),
        );
        return { ...staff, ...stat };
    });

    // 4. Proactive Monitoring & Lock Suggestion
    const alerts = staffs
        .filter((s) => {
            const hasShift = shiftAssignments.some(
                (sa) => sa.staffId.toString() === s._id.toString(),
            );
            return !hasShift;
        })
        .map((s) => ({
            staffId: s._id,
            staffName: s.name,
            type: 'missing_shift',
            message: `No active shift assignment found for ${s.name} this month. Stats will show 0.`,
        }));

    const allPaid = results.every((r) => r.status === 'paid');
    const suggestLock = results.length > 0 && allPaid;

    return {
        staffs: results,
        alerts,
        suggestLock,
    };
};

// ── Process Single Payment ─────────────────────────────────────────────

interface IPayrollProcessParams {
    staffId: string;
    month: string;
    amount: number;
    paymentMethod: string;
    note?: string;
    bonus?: number;
    deduction?: number;
    createdBy: string;
    paymentType?: 'salary' | 'overtime';
}

const processPayroll = async ({
    staffId,
    month,
    amount,
    paymentMethod,
    note,
    bonus = 0,
    deduction = 0,
    createdBy,
    paymentType = 'salary',
}: IPayrollProcessParams) => {
    // Check if month is locked
    const locked = await PayrollLockModel.findOne({ month });
    if (locked) {
        throw new Error(
            `Payroll for ${month} is locked. Unlock it before making changes.`,
        );
    }

    const { year, monthNum, startDate, endDate } = parseMonthRange(month);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staff = await StaffModel.findById(staffId).session(session);
        if (!staff) throw new Error('Staff not found');

        // Server-side amount verification for salary payments
        if (paymentType === 'salary') {
            const allAssignments = await ShiftAssignmentModel.find({
                staffId,
                $or: [
                    { endDate: null },
                    { endDate: { $gte: startDate } }
                ],
                startDate: { $lte: endDate }
            }).populate('shiftId').session(session);

            const allAttendance = await AttendanceDayModel.find({
                staffId: new Types.ObjectId(staffId),
                date: { $gte: startDate, $lte: endDate },
            }).session(session);

            const literalAbsentDays = allAttendance.filter(
                (a) => a.status === 'absent',
            ).length;

            const daysInMonth = eachDayOfInterval({
                start: startDate,
                end: endDate,
            });

            const staffSalary = staff.salary || 0;
            const perDaySalary = staffSalary / 30;

            const joinDate = staff.joinDate ? new Date(staff.joinDate) : null;
            const exitDate = staff.exitDate ? new Date(staff.exitDate) : null;

            let expectedWorkDates: Date[] = [];
            let workDaysCount = 0;
            let unemployedDays = 0;
            let missingPunches = 0;

            const todayUTC = new Date(
                Date.UTC(
                    new Date().getUTCFullYear(),
                    new Date().getUTCMonth(),
                    new Date().getUTCDate(),
                ),
            );
            const todayUTCStr = todayUTC.toISOString().split('T')[0]!;

            daysInMonth.forEach((day: Date) => {
                const dayStr = day.toISOString().split('T')[0]!;
                
                // 1. Check unemployed
                const isBeforeJoin = joinDate && day.getTime() < joinDate.getTime();
                const isAfterExit = exitDate && day.getTime() > exitDate.getTime();
                if (isBeforeJoin || isAfterExit) {
                    unemployedDays++;
                    return;
                }

                // 2. Resolve shift
                const dayAssignment = (allAssignments as any[]).find((sa) => {
                    const s = sa.startDate.toISOString().split('T')[0]!;
                    const e = sa.endDate ? sa.endDate.toISOString().split('T')[0] : '9999-12-31';
                    return dayStr >= s && dayStr <= e;
                });

                const shift: any = dayAssignment?.shiftId;
                if (!shift) return;

                // 3. Work day
                if (shift.workDays.includes(day.getUTCDay())) {
                    workDaysCount++;
                    expectedWorkDates.push(day);

                    // 4. Missing punch
                    if (dayStr < todayUTCStr) {
                        const hasRecord = allAttendance.some(
                            (a: any) => new Date(a.date).toISOString().split('T')[0] === dayStr,
                        );
                        if (!hasRecord) {
                            missingPunches++;
                        }
                    }
                }
            });

            if (allAssignments.length === 0) {
                workDaysCount = 22;
            }

            const absentDays = literalAbsentDays + missingPunches;
            const serverDeduction =
                (absentDays + unemployedDays) * perDaySalary;
            const serverPayable = Math.max(0, staffSalary - serverDeduction);
            const expectedAmount = Math.round(
                serverPayable + bonus - deduction,
            );
            const receivedAmount = Math.round(amount);

            // Allow ±2 tolerance for rounding differences
            if (Math.abs(expectedAmount - receivedAmount) > 2) {
                throw new Error(
                    `Amount mismatch. Server calculated ৳${expectedAmount} but received ৳${receivedAmount}. ` +
                        `(Base: ${Math.round(serverPayable)}, Bonus: ${bonus}, Deduction: ${deduction})`,
                );
            }
        }

        // Determine expense category
        const categoryName =
            paymentType === 'overtime' ? 'Overtime' : 'Salary & Wages';
        const categoryRegex =
            paymentType === 'overtime' ? /^Overtime/i : /^Salary/i;

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
                'Staff does not have a branch assigned. Cannot create expense.',
            );
        }

        // Build note
        const monthName = getMonthName(year, monthNum);
        const details = [];
        if (bonus) details.push(`Bonus: ${bonus}`);
        if (deduction) details.push(`Deduction: ${deduction}`);
        const extraNote = details.length > 0 ? ` (${details.join(', ')})` : '';
        const finalNote =
            (note || `${categoryName} Payment for ${monthName}`) + extraNote;

        const expenseTitle = `${
            paymentType === 'overtime' ? 'Overtime' : 'Salary'
        } - ${staffId} - ${monthName}`;

        // Check for existing expense — strict match only
        const existingExpense = await ExpenseModel.findOne({
            categoryId: category!._id,
            staffId: staffId,
            date: { $gte: startDate, $lte: endDate },
        }).session(session);

        let createdExpense;

        if (existingExpense) {
            existingExpense.amount = amount;
            existingExpense.note = finalNote;
            existingExpense.paymentMethod = paymentMethod || 'cash';
            existingExpense.createdBy = new Types.ObjectId(createdBy);
            await existingExpense.save({ session });
            createdExpense = existingExpense;
        } else {
            const expense = await ExpenseModel.create(
                [
                    {
                        date: endDate,
                        title: expenseTitle,
                        categoryId: category!._id,
                        branchId: staff.branchId,
                        staffId: staff._id,
                        amount: amount,
                        status: 'paid',
                        paymentMethod: paymentMethod || 'cash',
                        note: finalNote,
                        createdBy: createdBy,
                    },
                ],
                { session },
            );
            createdExpense = expense[0];
        }

        if (!createdExpense) {
            throw new Error('Failed to create/update expense record');
        }

        // ── Log Adjustment (Audit Trail) ──────────────────────────────────
        if (paymentType === 'salary' && (bonus || deduction)) {
            const existingLog = await SalaryAdjustmentLogModel.findOne({
                staffId: staff._id,
                month,
            }).session(session);

            if (existingLog) {
                existingLog.previousBonus = existingLog.bonus;
                existingLog.previousDeduction = existingLog.deduction;
                existingLog.bonus = bonus;
                existingLog.deduction = deduction;
                if (note) existingLog.note = note;
                existingLog.performedBy = new Types.ObjectId(createdBy);
                existingLog.expenseId = createdExpense._id;
                await existingLog.save({ session });
            } else {
                await SalaryAdjustmentLogModel.create(
                    [
                        {
                            staffId: staff._id,
                            month,
                            bonus,
                            deduction,
                            ...(note ? { note } : {}),
                            performedBy: new Types.ObjectId(createdBy),
                            expenseId: createdExpense._id,
                        },
                    ],
                    { session }
                );
            }
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

// ── Bulk Process ───────────────────────────────────────────────────────

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
    paymentType?: 'salary' | 'overtime';
}

const bulkProcessPayment = async ({
    month,
    payments,
    paymentMethod,
    createdBy,
    paymentType = 'salary',
}: IBulkPayrollParams) => {
    // Check lock once at bulk level
    const locked = await PayrollLockModel.findOne({ month });
    if (locked) {
        throw new Error(
            `Payroll for ${month} is locked. Unlock it before making changes.`,
        );
    }

    const results = [];
    const errors = [];

    for (const payment of payments) {
        try {
            const result = await processPayroll({
                staffId: payment.staffId,
                month,
                amount: payment.amount,
                paymentMethod,
                note: payment.note || '',
                bonus: payment.bonus ?? 0,
                deduction: payment.deduction ?? 0,
                createdBy,
                paymentType,
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

// ── Grace Attendance ───────────────────────────────────────────────────

const graceAttendance = async (
    staffId: string,
    dates: string[],
    note?: string,
) => {
    const updatedRecords = [];

    const shiftAssignment = await ShiftAssignmentModel.findOne({
        staffId,
        isActive: true,
    });

    if (!shiftAssignment) {
        throw new Error('Staff does not have an active shift assignment.');
    }

    for (const date of dates) {
        const targetDate = new Date(date);
        const y = targetDate.getUTCFullYear();
        const m = targetDate.getUTCMonth();
        const d = targetDate.getUTCDate();
        const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

        const attendance = await AttendanceDayModel.findOne({
            staffId,
            date: { $gte: start, $lte: end },
        });

        if (attendance) {
            attendance.status = 'present';
            attendance.notes = note
                ? `${attendance.notes || ''} [Grace: ${note}]`
                : (attendance.notes ?? null);
            attendance.isManual = true;
            await attendance.save();
            updatedRecords.push(attendance);
        } else {
            // Missing punch record -> upsert
            const newAttendance = await AttendanceDayModel.create({
                staffId: new Types.ObjectId(staffId),
                shiftId: shiftAssignment.shiftId,
                date: start,
                status: 'present',
                totalMinutes: 0,
                isManual: true,
                notes: note ? `[Grace: ${note}]` : '[Grace]',
            });
            updatedRecords.push(newAttendance);
        }
    }

    if (updatedRecords.length === 0) {
        throw new Error('No absent records found for the provided dates');
    }

    return updatedRecords;
};

// ── Absent Dates (UTC-safe) ────────────────────────────────────────────

const getAbsentDates = async (staffId: string, month: string) => {
    const { startDate, endDate } = parseMonthRange(month);

    const staff = await StaffModel.findById(staffId);
    if (!staff) throw new Error('Staff not found');

    const allAssignments = await ShiftAssignmentModel.find({
        staffId,
        $or: [
            { endDate: null },
            { endDate: { $gte: startDate } }
        ],
        startDate: { $lte: endDate }
    }).populate('shiftId').sort({ startDate: 1 });

    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const expectedWorkDates: Date[] = [];

    daysInMonth.forEach((day: Date) => {
        const dayStr = day.toISOString().split('T')[0]!;
        const dayAssignment = (allAssignments as any[]).find((sa) => {
            const s = sa.startDate.toISOString().split('T')[0]!;
            const e = sa.endDate ? sa.endDate.toISOString().split('T')[0] : '9999-12-31';
            return dayStr >= s && dayStr <= e;
        });

        const shift: any = dayAssignment?.shiftId;
        if (shift && shift.workDays.includes(day.getUTCDay())) {
            expectedWorkDates.push(day);
        }
    });

    // Fallback: If no shifts assigned, return empty list (or could use 22-day fallback if needed, 
    // but here we want to show actual absences based on tracked shifts).

    const allAttendance = await AttendanceDayModel.find({
        staffId,
        date: { $gte: startDate, $lte: endDate },
    });

    const literalAbsents = allAttendance
        .filter((a) => a.status === 'absent')
        .map((a: any) => ({ date: a.date, status: 'absent' }));

    const missingPunches: { date: Date; status: string }[] = [];
    const todayUTC = new Date(
        Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate(),
        ),
    );
    const todayUTCStr = todayUTC.toISOString().split('T')[0]!;
    const joinStr = staff.joinDate ? new Date(staff.joinDate).toISOString().split('T')[0] : null;
    const exitStr = staff.exitDate ? new Date(staff.exitDate).toISOString().split('T')[0] : null;

    expectedWorkDates.forEach((day: Date) => {
        const dayStr = day.toISOString().split('T')[0]!;
        if (dayStr >= todayUTCStr) return;

        const isBeforeJoin = joinStr && dayStr < joinStr;
        const isAfterExit = exitStr && dayStr > exitStr;
        if (isBeforeJoin || isAfterExit) return;

        const hasRecord = allAttendance.some(
            (a: any) => new Date(a.date).toISOString().split('T')[0] === dayStr,
        );

        if (!hasRecord) {
            missingPunches.push({ date: day, status: 'absent' });
        }
    });

    return [...literalAbsents, ...missingPunches].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
};

// ── Undo Payment (UTC-safe) ────────────────────────────────────────────

const undoPayroll = async (
    staffId: string,
    month: string,
    paymentType: 'salary' | 'overtime' = 'salary',
) => {
    // Check lock
    const locked = await PayrollLockModel.findOne({ month });
    if (locked) {
        throw new Error(
            `Payroll for ${month} is locked. Unlock it before making changes.`,
        );
    }

    const { startDate, endDate } = parseMonthRange(month);

    const categoryRegex =
        paymentType === 'overtime' ? /^Overtime/i : /^Salary/i;

    const category = await ExpenseCategoryModel.findOne({
        name: { $regex: categoryRegex },
    });

    if (!category) {
        throw new Error(
            `${paymentType === 'overtime' ? 'Overtime' : 'Salary'} category not found`,
        );
    }

    // Strict match by staffId + categoryId + date range
    const expense = await ExpenseModel.findOneAndDelete({
        staffId,
        categoryId: category._id,
        date: { $gte: startDate, $lte: endDate },
    });

    if (!expense) {
        throw new Error('Payroll record not found for this month');
    }

    return { message: 'Payroll payment undone successfully' };
};

// ── Payroll Lock Management ────────────────────────────────────────────

const getLockStatus = async (month: string) => {
    return await PayrollLockModel.findOne({ month });
};

const lockMonth = async (month: string, userId: string) => {
    const existing = await PayrollLockModel.findOne({ month });
    if (existing) {
        throw new Error(`Payroll for ${month} is already locked`);
    }

    return await PayrollLockModel.create({
        month,
        lockedBy: new Types.ObjectId(userId),
    });
};

const unlockMonth = async (month: string) => {
    const result = await PayrollLockModel.findOneAndDelete({ month });
    if (!result) {
        throw new Error(`Payroll for ${month} is not locked`);
    }
    return result;
};

export default {
    getPayrollPreview,
    processPayroll,
    bulkProcessPayment,
    graceAttendance,
    getAbsentDates,
    undoPayroll,
    getLockStatus,
    lockMonth,
    unlockMonth,
};
