import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import ExportStaffDialog from './export-staff-dialog';
import type { IPayrollItem } from '../../types/payroll.type';

for (const format of ['excel', 'pdf'] as const) {
    test(`${format} selection opens safely for older payroll rows with missing amounts`, () => {
        // Older API responses could include ineligible staff with no computed amounts.
        const row = { _id: 'staff-1', staffId: 'EMP001', name: 'Example', designation: 'Staff' } as IPayrollItem;
        assert.doesNotThrow(() => renderToString(
            <ExportStaffDialog data={[row]} format={format} isOvertime={false} onClose={() => {}} onConfirm={() => {}} />,
        ));
    });
}
