export interface IOvertime {
    _id: string;
    staffId: {
        _id: string;
        name: string;
        staffId: string;
        designation: string;
        photo?: string;
    };
    shiftId?: string;
    date: string;
    type: 'pre_shift' | 'post_shift' | 'weekend' | 'holiday';
    startTime: string;
    actualStartTime?: string;
    endTime?: string;
    durationMinutes: number;
    actualDurationMinutes?: number;
    earlyStopMinutes?: number;
    status: 'pending' | 'approved' | 'rejected';
    isAutoStopped?: boolean;
    reason?: string;
    createdBy?: {
        _id: string;
        name: string;
        email: string;
    };
    approvedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}
