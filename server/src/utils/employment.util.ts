import { getBDDateString, getBDStartOfDay } from './date.util.js';

type Day = Date | string | number;
export interface Employment {
    joinDate?: Day;
    exitDate?: Day | null;
    status?: string;
    inactivePeriods?: { startDate: Day; endDate?: Day | null; status?: string }[];
}

/** exitDate is the LAST included working day, in Asia/Dhaka. */
export function isEmployedOn(staff: Employment, date: Day): boolean {
    const day = getBDDateString(date);
    if (staff.joinDate && day < getBDDateString(staff.joinDate)) return false;
    if (staff.exitDate && day > getBDDateString(staff.exitDate)) return false;
    // Never invent an exit date for legacy inactive staff.
    if (staff.status !== 'active' && !staff.exitDate && !staff.inactivePeriods?.length) return false;
    return !staff.inactivePeriods?.some(period =>
        day >= getBDDateString(period.startDate) &&
        (!period.endDate || day <= getBDDateString(period.endDate)));
}

export function assertEmployedOn(staff: Employment | null | undefined, date: Day) {
    if (!staff || !isEmployedOn(staff, date)) {
        throw new Error(`Staff is not active on ${getBDDateString(date)}. Check employment dates.`);
    }
}

export function assertEmployedDuring(staff: Employment | null, start: Day, end: Day) {
    const first = getBDStartOfDay(start);
    const last = getBDStartOfDay(end);
    if (Number.isNaN(first.getTime()) || first > last) throw new Error('Invalid date range');
    for (let day = first; day <= last; day = new Date(day.getTime() + 86400000)) {
        assertEmployedOn(staff, day);
    }
}

/** Mongo equivalent used BEFORE grouping, pagination and counting. */
export function employmentExpr(date: Date | string = new Date(), prefix = ''): any {
    const field = (name: string) => `$${prefix}${name}`;
    const day = typeof date === 'string' && date.startsWith('$')
        ? { $dateTrunc: { date, unit: 'day', timezone: 'Asia/Dhaka' } }
        : getBDStartOfDay(date);
    return {
        $and: [
            { $lte: [{ $dateTrunc: { date: { $ifNull: [field('joinDate'), new Date(0)] }, unit: 'day', timezone: 'Asia/Dhaka' } }, day] },
            { $or: [
                { $eq: [{ $ifNull: [field('exitDate'), null] }, null] },
                { $gte: [{ $dateTrunc: { date: field('exitDate'), unit: 'day', timezone: 'Asia/Dhaka' } }, day] },
            ] },
            { $or: [
                { $eq: [field('status'), 'active'] },
                { $ne: [{ $ifNull: [field('exitDate'), null] }, null] },
                { $gt: [{ $size: { $ifNull: [field('inactivePeriods'), []] } }, 0] },
            ] },
            { $not: [{ $anyElementTrue: [{ $map: {
                input: { $ifNull: [field('inactivePeriods'), []] }, as: 'period',
                in: { $and: [
                    { $lte: ['$$period.startDate', day] },
                    { $or: [
                        { $eq: [{ $ifNull: ['$$period.endDate', null] }, null] },
                        { $gte: ['$$period.endDate', day] },
                    ] },
                ] },
            } }] }] },
        ],
    };
}

/** Keep the stored target status, but display active until the last day ends. */
export function employmentStatusStage() {
    const pending = { $and: [
        { $ne: ['$status', 'active'] },
        { $gte: ['$exitDate', getBDStartOfDay()] },
    ] };
    return { $addFields: {
        pendingStatus: { $cond: [pending, '$status', '$$REMOVE'] },
        status: { $cond: [pending, 'active', '$status'] },
    } };
}

/** Stop a running timer at the first employment break it crosses. */
export function employmentEnd(staff: Employment, start: Day, end: Day = new Date()): Date {
    let stop = new Date(end);
    if (staff.exitDate) stop = new Date(Math.min(stop.getTime(), getBDStartOfDay(staff.exitDate).getTime() + 86400000));
    for (const period of staff.inactivePeriods || []) {
        const boundary = getBDStartOfDay(period.startDate);
        if (boundary > new Date(start) && boundary < stop) stop = boundary;
    }
    return new Date(Math.max(new Date(start).getTime(), stop.getTime()));
}

export function eligibleOvertimeMinutes(staff: Employment, overtime: {
    date: Day; startTime?: Day; durationMinutes?: number;
}): number {
    if (!isEmployedOn(staff, overtime.date)) return 0;
    const minutes = Math.max(0, overtime.durationMinutes || 0);
    if (!overtime.startTime) return minutes;
    if (!isEmployedOn(staff, overtime.startTime)) return 0;
    const start = new Date(overtime.startTime);
    const end = employmentEnd(staff, start, new Date(start.getTime() + minutes * 60000));
    return Math.max(0, Math.min(minutes, (end.getTime() - start.getTime()) / 60000));
}

/** Cap scheduled OT minutes at the first inactive boundary, without rewriting history. */
export function overtimeMinutesExpr(prefix = 'employmentStaff.', startField = '$startTime', minutesField = '$durationMinutes'): any {
    const exit = `$${prefix}exitDate`;
    return { $let: {
        vars: {
            plannedEnd: { $add: [startField, { $multiply: [minutesField, 60000] }] },
            exitEnd: { $cond: [
                { $ne: [{ $ifNull: [exit, null] }, null] },
                { $add: [{ $dateTrunc: { date: exit, unit: 'day', timezone: 'Asia/Dhaka' } }, 86400000] },
                new Date('9999-12-31'),
            ] },
        },
        in: { $cond: [employmentExpr(startField, prefix), {
            $max: [0, { $divide: [{ $subtract: [
                { $reduce: {
                    input: { $ifNull: [`$${prefix}inactivePeriods`, []] },
                    initialValue: { $min: ['$$plannedEnd', '$$exitEnd'] },
                    in: { $cond: [{ $gt: ['$$this.startDate', startField] }, { $min: ['$$value', '$$this.startDate'] }, '$$value'] },
                } }, startField,
            ] }, 60000] }],
        }, 0] },
    } };
}
