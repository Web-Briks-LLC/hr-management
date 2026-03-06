"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var attendanceDaySchema = new mongoose_1.Schema({
    staffId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true,
    },
    shiftId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
// Unique compound index: one attendance record per staff per day
attendanceDaySchema.index({ staffId: 1, date: 1 }, { unique: true });
var AttendanceDayModel = (0, mongoose_1.model)('AttendanceDay', attendanceDaySchema);
exports.default = AttendanceDayModel;
