import type { Types } from 'mongoose';

export interface IAttendanceEvent {
    type: 'check_in' | 'check_out';
    staffId: Types.ObjectId;
    at: Date;
    source: 'web' | 'mobile' | 'admin' | 'biometric';
    shiftId: Types.ObjectId;
    ip?: string | null;
    userAgent?: string | null;
    isManual?: boolean | null;
    remarks?: string | null;
}
