import { buildEmploymentUpdate } from '../utils/employment-state.util.js';
import type { ClientSession, Types } from 'mongoose';
import type IStaff from '../types/staff.type.js';
import { isEmployedOn } from '../utils/employment.util.js';
import { getBDDateString, getBDMonthRange } from '../utils/date.util.js';
import { PayrollLockModel } from '../models/payroll-lock.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import LeaveApplicationModel from '../models/leave_application.model.js';
import LeaveBalanceModel from '../models/leave-balance.model.js';
import { freezeInactiveWorkSessions } from './employment-timers.service.js';

export async function prepareEmploymentUpdate(
    staff: IStaff & { _id: Types.ObjectId }, data: Partial<IStaff>, session: ClientSession,
) {
    // History and derived status can only be written here.
    delete data.inactivePeriods;
    delete data.pendingStatus;
    if (data.status === undefined && data.exitDate === undefined && data.joinDate === undefined) return {};
    const { next, changed } = buildEmploymentUpdate(staff, data);
    const { status, joinDate, inactivePeriods: periods, exitDate } = next;
    Object.assign(data, { status, joinDate, inactivePeriods: periods });
    if (exitDate) data.exitDate = exitDate;
    else delete data.exitDate;
    if (!changed) return exitDate ? {} : { exitDate: 1 };

    // Refuse changes to any day already covered by locked or paid payroll.
    const locks = await PayrollLockModel.find().session(session).lean();
    const categories = await ExpenseCategoryModel.find({ name: { $in: [/^Salary/i, /^Overtime/i] } }).session(session).lean();
    const expenses = await ExpenseModel.find({
        categoryId: { $in: categories.map(c => c._id) },
        $or: [{ staffId: staff._id }, { staffId: null, note: { $regex: `${staff._id}:` } }],
    }).session(session).lean();
    const protectedMonths = new Set(locks.map(l => l.month));
    for (const expense of expenses) {
        const month = expense.billingYear && expense.billingMonth
            ? `${expense.billingYear}-${String(expense.billingMonth).padStart(2, '0')}`
            : getBDDateString(expense.date).slice(0, 7);
        protectedMonths.add(month);
    }
    for (const month of protectedMonths) {
        const { startDate, endDate } = getBDMonthRange(month);
        for (let day = startDate; day <= endDate; day = new Date(day.getTime() + 86400000)) {
            if (isEmployedOn(staff.status !== 'active' && !staff.exitDate && !staff.inactivePeriods?.length ? { ...staff, status: 'active' } : staff, day) !== isEmployedOn(next, day)) {
                throw new Error(`Employment dates affect locked or paid payroll for ${month}. Unlock or undo that payment before changing dates.`);
            }
        }
    }

    const pendingLeaves = await LeaveApplicationModel.find({ staffId: staff._id, status: 'pending' }).session(session);
    for (const leave of pendingLeaves) {
        if (leave.requestedDates.some(d => isEmployedOn(next, d))) continue;
        await LeaveApplicationModel.updateOne({ _id: leave._id }, { $set: {
            status: 'cancelled', commentByApprover: 'Cancelled because requested dates are outside employment.',
        } }, { session });
    }
    // Exclude invalid approved leave and refund its balance; keep the original request as history.
    const leaves = await LeaveApplicationModel.find({ staffId: staff._id, status: { $in: ['approved', 'partially_approved'] } }).session(session);
    for (const leave of leaves) {
        const removed = leave.approvedDates.filter(d => !isEmployedOn(next, d));
        if (!removed.length) continue;
        leave.approvedDates = leave.approvedDates.filter(d => isEmployedOn(next, d));
        leave.paidLeaveDates = leave.paidLeaveDates.filter(d => isEmployedOn(next, d));
        const rejected = new Map([...leave.rejectedDates, ...removed].map(d => [getBDDateString(d), d]));
        leave.rejectedDates = [...rejected.values()];
        leave.status = leave.approvedDates.length ? 'partially_approved' : 'revoked';
        leave.commentByApprover = `${leave.commentByApprover || ''}\nEmployment dates updated; dates outside employment excluded.`.trim();
        await LeaveApplicationModel.updateOne({ _id: leave._id }, { $set: {
            approvedDates: leave.approvedDates, paidLeaveDates: leave.paidLeaveDates,
            rejectedDates: leave.rejectedDates, status: leave.status, commentByApprover: leave.commentByApprover,
        } }, { session });
        if (leave.leaveType === 'annual' || leave.leaveType === 'sick') {
            const years = new Map<number, number>();
            for (const date of removed) {
                const year = Number(getBDDateString(date).slice(0, 4));
                years.set(year, (years.get(year) || 0) + 1);
            }
            for (const [year, count] of years) await LeaveBalanceModel.updateOne(
                { staffId: staff._id, year },
                { $inc: { [`${leave.leaveType}LeaveUsed`]: -count, [`${leave.leaveType}LeaveRemaining`]: count } },
                { session },
            );
        }
    }
    await freezeInactiveWorkSessions({ ...next, _id: staff._id }, session);
    Object.assign(data, { status, joinDate, inactivePeriods: periods });
    if (exitDate) data.exitDate = exitDate;
    else delete data.exitDate;
    return exitDate ? {} : { exitDate: 1 };
}
