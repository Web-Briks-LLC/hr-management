import { model, Schema } from 'mongoose';
import type { IAttendanceDay } from '../types/attendance-day.type.js';

const attendanceDaySchema = new Schema<IAttendanceDay>(
    {
        staffId: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            index: true,
        },

        shiftId: {
            type: Schema.Types.ObjectId,
            ref: 'Shift',
            index: true,
            required: true,
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: [
                'present',
                'absent',
                'on_leave',
                'weekend',
                'holiday',
                'half_day',
                'late',
                'early_exit',
            ],
            required: true,
            index: true,
        },

        checkInAt: { type: Date },
        checkOutAt: { type: Date },

        totalMinutes: { type: Number, default: 0 },
        lateMinutes: { type: Number, default: 0 },
        earlyExitMinutes: { type: Number, default: 0 },
        otMinutes: { type: Number, default: 0 },

        payableAmount: { type: Number, default: 0 },
        deductionAmount: { type: Number, default: 0 },
        otAmount: { type: Number, default: 0 },

        leaveRequestId: {
            type: Schema.Types.ObjectId,
            ref: 'LeaveRequest',
        },

        isManual: {
            type: Boolean,
            default: false,
            index: true,
        },

        isAutoAbsent: {
            type: Boolean,
            default: false,
            index: true,
        },

        notes: { type: String },

        processedAt: {
            type: Date,
        },
    },
    { timestamps: true },
);

// Unique compound index: one attendance record per staff per day
attendanceDaySchema.index({ staffId: 1, date: 1 }, { unique: true });

const AttendanceDayModel = model<IAttendanceDay>(
    'AttendanceDay',
    attendanceDaySchema,
);
export default AttendanceDayModel;
