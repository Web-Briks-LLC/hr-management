import { Types } from 'mongoose';

export interface IShiftAssignment {
    staffId: Types.ObjectId;
    shiftId: Types.ObjectId;
    startDate: Date;
    endDate: Date | null;
    assignedBy: Types.ObjectId;
    isActive: boolean;
}
