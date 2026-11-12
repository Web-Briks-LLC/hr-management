import type IStaff from '../types/staff.type.js';
import { getBDStartOfDay, getBDDateString } from './date.util.js';

/** Compute employment history without modifying existing records. */
export function buildEmploymentUpdate(staff: IStaff, data: Partial<IStaff>, now = new Date()) {
    const status = data.status ?? staff.status;
    if (!['active', 'inactive', 'terminated'].includes(status)) throw new Error('Invalid staff status');
    const today = getBDStartOfDay(now);
    const joinDate = getBDStartOfDay(data.joinDate ?? staff.joinDate);
    if (Number.isNaN(joinDate.getTime())) throw new Error('Invalid join date');
    const periods = (staff.inactivePeriods || []).map(p => ({
        startDate: new Date(p.startDate),
        ...(p.endDate ? { endDate: new Date(p.endDate) } : {}),
        status: p.status,
    }));
    const open = periods.find(p => !p.endDate);
    let exitDate: Date | undefined;
    if (status !== 'active') {
        const value = data.exitDate ?? staff.exitDate;
        if (!value) throw new Error('Select the last active date for inactive or terminated staff');
        exitDate = getBDStartOfDay(value);
        if (Number.isNaN(exitDate.getTime()) || exitDate < joinDate) {
            throw new Error('Last active date must be on or after the join date');
        }
        const startDate = new Date(exitDate.getTime() + 86400000);
        if (periods.some(p => p.endDate && startDate <= p.endDate)) {
            throw new Error('Last active date overlaps an earlier inactive period');
        }
        if (open) Object.assign(open, { startDate, status });
        else periods.push({ startDate, status });
    } else {
        if (staff.status !== 'active' && !staff.exitDate && !periods.length) {
            throw new Error('Set the previous last active date before reactivating this legacy staff');
        }
        // Cancel a scheduled exit, or resume today and retain the historical gap.
        if (open) {
            if (open.startDate >= today) periods.splice(periods.indexOf(open), 1);
            else open.endDate = new Date(today.getTime() - 86400000);
        } else if (staff.exitDate && getBDDateString(staff.exitDate) < getBDDateString(today)) {
            const startDate = new Date(getBDStartOfDay(staff.exitDate).getTime() + 86400000);
            if (startDate < today) periods.push({ startDate, endDate: new Date(today.getTime() - 86400000), status: 'inactive' });
        }
    }
    const next: IStaff = { ...staff, ...data, status, joinDate, inactivePeriods: periods };
    if (exitDate) next.exitDate = exitDate;
    else delete next.exitDate;
    const changed = JSON.stringify([staff.status, staff.joinDate, staff.exitDate, staff.inactivePeriods || []]) !==
        JSON.stringify([next.status, next.joinDate, next.exitDate, next.inactivePeriods]);
    return { next, changed };
}
