import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import type IStaff from '../types/staff.type.js';
import { isEmployedOn, assertEmployedDuring, employmentEnd, eligibleOvertimeMinutes } from '../utils/employment.util.js';
import { buildEmploymentUpdate } from '../utils/employment-state.util.js';
import { getBDDateString } from '../utils/date.util.js';
import { prepareEmploymentUpdate } from '../services/employment.service.js';
import { PayrollLockModel } from '../models/payroll-lock.model.js';
import ExpenseModel from '../models/expense.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import LeaveApplicationModel from '../models/leave_application.model.js';
import LeaveBalanceModel from '../models/leave-balance.model.js';
import ProductionWorkSessionModel from '../models/production-session.model.js';
import { freezeInactiveWorkSessions } from '../services/employment-timers.service.js';

const person = (overrides: Partial<IStaff> = {}) => ({
    _id: new Types.ObjectId(), status: 'active', joinDate: new Date('2026-01-01'),
    inactivePeriods: [], ...overrides,
}) as IStaff & { _id: Types.ObjectId };
const now = new Date('2026-11-20T10:00:00+06:00');
const exit = new Date('2026-11-15');

test('last active date is inclusive through Bangladesh midnight', () => {
    const staff = person({ status: 'terminated', exitDate: exit });
    assert.equal(isEmployedOn(staff, '2026-11-15T17:59:59.999Z'), true);
    assert.equal(isEmployedOn(staff, '2026-11-15T18:00:00Z'), false);
    assert.equal(isEmployedOn(staff, '2026-10-01'), true);
});

test('future exit leaves staff eligible until the selected day ends', () => {
    const { next } = buildEmploymentUpdate(person(), { status: 'inactive', exitDate: exit }, new Date('2026-11-10'));
    assert.equal(isEmployedOn(next, '2026-11-10'), true);
    assert.equal(isEmployedOn(next, '2026-11-15'), true);
    assert.equal(isEmployedOn(next, '2026-11-16'), false);
});

test('reactivation preserves the inactive gap and starts today', () => {
    const staff = buildEmploymentUpdate(person(), { status: 'inactive', exitDate: exit }, now).next;
    const { next } = buildEmploymentUpdate(staff, { status: 'active' }, now);
    assert.equal(next.exitDate, undefined);
    assert.equal(isEmployedOn(next, '2026-11-15'), true);
    assert.equal(isEmployedOn(next, '2026-11-16'), false);
    assert.equal(isEmployedOn(next, '2026-11-19'), false);
    assert.equal(isEmployedOn(next, '2026-11-20'), true);
    assert.equal(staff.inactivePeriods?.[0]?.endDate, undefined, 'original history is not mutated');
});

test('cancelling a future exit creates no historical inactive gap', () => {
    const staff = buildEmploymentUpdate(person(), { status: 'terminated', exitDate: exit }, new Date('2026-11-10')).next;
    const { next } = buildEmploymentUpdate(staff, { status: 'active' }, new Date('2026-11-12'));
    assert.deepEqual(next.inactivePeriods, []);
    assert.equal(isEmployedOn(next, '2026-11-30'), true);
});

test('multiple exits preserve earlier gaps and reject overlapping dates', () => {
    const first = buildEmploymentUpdate(person(), { status: 'inactive', exitDate: exit }, now).next;
    const resumed = buildEmploymentUpdate(first, { status: 'active' }, now).next;
    const second = buildEmploymentUpdate(resumed, { status: 'terminated', exitDate: new Date('2026-11-25') }, now).next;
    assert.equal(second.inactivePeriods?.length, 2);
    assert.equal(isEmployedOn(second, '2026-11-18'), false);
    assert.equal(isEmployedOn(second, '2026-11-24'), true);
    assert.equal(isEmployedOn(second, '2026-11-26'), false);
    assert.throws(() => buildEmploymentUpdate(resumed, { status: 'inactive', exitDate: new Date('2026-11-17') }, now), /overlaps/);
});

test('legacy inactive staff require a known exit before reactivation', () => {
    const legacy = person({ status: 'inactive' });
    assert.equal(isEmployedOn(legacy, '2026-11-01'), false);
    assert.throws(() => buildEmploymentUpdate(legacy, { status: 'active' }, now), /previous last active date/);
    assert.throws(() => buildEmploymentUpdate(person(), { status: 'terminated' }, now), /Select the last active date/);
    assert.throws(() => buildEmploymentUpdate(person(), { status: 'inactive', exitDate: new Date('2025-12-31') }, now), /join date/);
});

test('leave range cannot cross an inactive day, including weekends', () => {
    const staff = person({ status: 'terminated', exitDate: exit });
    assert.doesNotThrow(() => assertEmployedDuring(staff, '2026-11-14', '2026-11-15'));
    assert.throws(() => assertEmployedDuring(staff, '2026-11-14', '2026-11-16'), /not active/);
});

test('timers stop at the cutoff and cannot bridge an old inactive period', () => {
    const staff = person({ status: 'inactive', exitDate: exit });
    assert.equal(employmentEnd(staff, '2026-11-15T22:00:00+06:00', '2026-11-16T06:00:00+06:00').toISOString(), '2026-11-15T18:00:00.000Z');
    const resumed = buildEmploymentUpdate(buildEmploymentUpdate(person(), { status: 'inactive', exitDate: exit }, now).next, { status: 'active' }, now).next;
    assert.equal(getBDDateString(employmentEnd(resumed, '2026-11-15T22:00:00+06:00', now)), '2026-11-16');
});

// Mock persistence only; exercise the real employment transition / payroll protection service.
function stubPersistence(t: TestContext, locks: unknown[] = [], expenses: unknown[] = []) {
    const query = (rows: unknown[]) => ({ session: () => ({ lean: async () => rows }) });
    t.mock.method(PayrollLockModel, 'find', () => query(locks));
    t.mock.method(ExpenseCategoryModel, 'find', () => query([{ _id: new Types.ObjectId() }]));
    t.mock.method(ExpenseModel, 'find', () => query(expenses));
    t.mock.method(LeaveApplicationModel, 'find', () => ({ session: async () => [] }));
    t.mock.method(ProductionWorkSessionModel, 'find', () => query([]));
}
const session = {} as ClientSession;

test('locked month rejects a backdated exit but accepts a later exit', async t => {
    stubPersistence(t, [{ month: '2026-10' }]);
    await assert.rejects(prepareEmploymentUpdate(person(), { status: 'inactive', exitDate: new Date('2026-10-15') }, session), /locked or paid payroll/);
    const data: Partial<IStaff> = { status: 'inactive', exitDate: exit };
    await prepareEmploymentUpdate(person(), data, session);
    assert.equal(getBDDateString(data.inactivePeriods![0]!.startDate), '2026-11-16');
});

test('paid payroll protects billing month even when paid in a later month', async t => {
    stubPersistence(t, [], [{ billingYear: 2026, billingMonth: 10, date: new Date('2026-11-05') }]);
    await assert.rejects(prepareEmploymentUpdate(person(), { status: 'terminated', exitDate: new Date('2026-10-25') }, session), /2026-10/);
});

test('old payroll remains protected when reactivating; gaps stay excluded', async t => {
    stubPersistence(t, [{ month: '2026-10' }]);
    const staff = buildEmploymentUpdate(person(), { status: 'inactive', exitDate: new Date('2026-10-15') }, now).next;
    const data: Partial<IStaff> = { status: 'active' };
    const unset = await prepareEmploymentUpdate({ ...staff, _id: new Types.ObjectId() }, data, session);
    assert.equal(unset.exitDate, 1);
    assert.equal(isEmployedOn({ ...staff, ...data, exitDate: undefined } as unknown as IStaff, '2026-10-20'), false);
});

test('employment update refunds only invalid approved leave days', async t => {
    stubPersistence(t);
    const leave = { _id: new Types.ObjectId(), staffId: new Types.ObjectId(), leaveType: 'annual', approvedDates: [new Date('2026-11-14'), new Date('2026-11-16')], paidLeaveDates: [], rejectedDates: [], status: 'approved' };
    t.mock.method(LeaveApplicationModel, 'find', (query: { status: unknown }) => ({ session: async () => query.status === 'pending' ? [] : [leave] }));
    const updates = t.mock.method(LeaveApplicationModel, 'updateOne', async () => ({}));
    const refunds = t.mock.method(LeaveBalanceModel, 'updateOne', async () => ({}));
    await prepareEmploymentUpdate(person(), { status: 'inactive', exitDate: exit }, session);
    assert.equal(updates.mock.calls.length, 1);
    assert.equal(leave.approvedDates.length, 1);
    const refund = refunds.mock.calls[0]!.arguments[1] as { $inc: Record<string, number> };
    assert.equal(refund.$inc.annualLeaveUsed, -1);
    assert.equal(refund.$inc.annualLeaveRemaining, 1);
});

test('a running production timer is held at midnight after the final day', async t => {
    const staff = person({ status: 'terminated', exitDate: new Date('2020-01-15'), joinDate: new Date('2020-01-01') });
    t.mock.method(ProductionWorkSessionModel, 'find', () => ({ session: () => ({ lean: async () => [{ _id: new Types.ObjectId(), staffId: staff._id, startTime: new Date('2020-01-15T22:00:00+06:00') }] }) }));
    const updates = t.mock.method(ProductionWorkSessionModel, 'updateOne', async () => ({}));
    await freezeInactiveWorkSessions(staff);
    const update = updates.mock.calls[0]!.arguments[1] as { $set: { pausedAt: Date } };
    assert.equal(update.$set.pausedAt.toISOString(), '2020-01-15T18:00:00.000Z');
});

test('approved overtime crossing the last day only pays minutes before midnight', () => {
    const staff = person({ status: 'terminated', exitDate: exit });
    assert.equal(eligibleOvertimeMinutes(staff, { date: exit, startTime: '2026-11-15T23:00:00+06:00', durationMinutes: 180 }), 60);
    assert.equal(eligibleOvertimeMinutes(staff, { date: '2026-11-16', startTime: '2026-11-16T00:00:00+06:00', durationMinutes: 60 }), 0);
});
