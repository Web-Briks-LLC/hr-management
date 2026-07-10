import { model, Schema } from 'mongoose';
import type { IAttendanceEvent } from '../types/attendance-event.type.js';

const attendanceEventSchema = new Schema<IAttendanceEvent>(
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

        type: {
            type: String,
            enum: ['check_in', 'check_out'],
            required: true,
        },

        at: {
            type: Date,
            required: true,
            index: true,
        },

        source: {
            type: String,
            enum: ['web', 'mobile', 'admin', 'biometric'],
            default: 'web',
        },

        ip: { type: String },
        userAgent: { type: String },

        isManual: {
            type: Boolean,
        },

        remarks: {
            type: String,
        },
    },
    { timestamps: true }
);

attendanceEventSchema.index({ staffId: 1, type: 1, at: 1 }, { unique: true });

attendanceEventSchema.index({ staffId: 1, at: 1 });

attendanceEventSchema.index({ shiftId: 1, at: 1 });

const AttendanceEventModel = model<IAttendanceEvent>('AttendanceEvent', attendanceEventSchema);
export default AttendanceEventModel;
