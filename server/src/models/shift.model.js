"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var shiftSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    branchId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
        index: true,
    },
    timeZone: {
        type: String,
        default: 'Asia/Dhaka',
    },
    workDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5, 6],
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
    gracePeriodMinutes: {
        type: Number,
        default: 10,
    },
    lateAfterMinutes: {
        type: Number,
        default: 10,
    },
    halfDayAfterMinutes: {
        type: Number,
        default: 240,
    },
    otEnabled: {
        type: Boolean,
        default: false,
    },
    minOtMinutes: {
        type: Number,
        default: 30,
    },
    roundOtTo: {
        type: Number,
        default: 30,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });
var ShiftModel = (0, mongoose_1.model)('Shift', shiftSchema);
exports.default = ShiftModel;
