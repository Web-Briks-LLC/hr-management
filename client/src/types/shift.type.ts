import { IBranch } from './branch.type';

export type ShiftWorkDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IShift {
    _id: string;

    name: string;
    code: string;

    branchId: IBranch;

    timeZone: string;

    workDays: ShiftWorkDay[];

    startTime: string;
    endTime: string;

    gracePeriodMinutes: number;
    lateAfterMinutes: number;
    halfDayAfterMinutes: number;

    otEnabled: boolean;
    minOtMinutes: number;
    roundOtTo: number;

    isActive: boolean;

    createdBy: string;

    createdAt: Date;
    updatedAt: Date;
}
