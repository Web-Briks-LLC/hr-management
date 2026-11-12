import test from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import StaffModel from '../models/staff.model.js';
import AttendanceDayModel from '../models/attendance-day.model.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';
import OvertimeModel from '../models/overtime.model.js';
import ExpenseCategoryModel from '../models/expense-category.model.js';
import ShiftOffDateModel from '../models/shift-off-date.model.js';
import payrollService from '../services/payroll.service.js';

test('payroll preview excludes staff without eligible days instead of returning rows without amounts', async t => {
    const activeId = new Types.ObjectId();
    const inactiveId = new Types.ObjectId();
    const gapId = new Types.ObjectId();
    const exitedId = new Types.ObjectId();
    const base = { joinDate: new Date('2026-01-01'), salary: 30000, name: 'Example', designation: 'Staff' };
    t.mock.method(StaffModel, 'aggregate', async () => [
        { ...base, _id: activeId, status: 'active' },
        { ...base, _id: inactiveId, status: 'inactive' },
        { ...base, _id: gapId, status: 'active', inactivePeriods: [{ startDate: new Date('2026-10-31'), endDate: new Date('2026-12-01') }] },
        { ...base, _id: exitedId, status: 'terminated', exitDate: new Date('2026-11-15') },
    ]);
    t.mock.method(ShiftAssignmentModel, 'find', () => ({ populate: async () => [] }));
    t.mock.method(AttendanceDayModel, 'find', async () => []);
    t.mock.method(OvertimeModel, 'find', async () => []);
    t.mock.method(ExpenseCategoryModel, 'find', async () => []);
    t.mock.method(ShiftOffDateModel, 'find', () => ({ lean: async () => [] }));

    const result = await payrollService.getPayrollPreview({ month: '2026-11' });
    assert.deepEqual(result.staffs.map(row => String(row._id)), [String(activeId), String(exitedId)]);
    for (const row of result.staffs) {
        assert.equal(Number.isFinite(row.payableSalary), true);
        assert.equal(Number.isFinite(row.otPayable), true);
    }
    assert.deepEqual(result.alerts.map(alert => String(alert.staffId)), [String(activeId), String(exitedId)]);
});
