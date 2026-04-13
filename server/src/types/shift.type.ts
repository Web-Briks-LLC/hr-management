import { Types } from 'mongoose';

export type ShiftWorkDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IShift {
    _id: Types.ObjectId;

    name: string;
    code: string;

    branchId: Types.ObjectId;

    timeZone: string;

    workDays: ShiftWorkDay[];

    startTime?: string;
    endTime?: string;
    
    isFlexible?: boolean;

    gracePeriodMinutes: number;
    lateAfterMinutes: number;
    halfDayAfterMinutes: number;

    otEnabled: boolean;
    minOtMinutes: number;
    roundOtTo: number;

    isActive: boolean;

    createdBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}
