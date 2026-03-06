"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var shiftAssignmentSchema = new mongoose_1.Schema({
    staffId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true,
    },
    shiftId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Shift',
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
        index: true,
    },
    endDate: {
        type: Date,
        default: null,
    },
    assignedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
shiftAssignmentSchema.index({ staffId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
shiftAssignmentSchema.index({ staffId: 1, startDate: 1, endDate: 1 });
var ShiftAssignmentModel = (0, mongoose_1.model)('ShiftAssignment', shiftAssignmentSchema);
exports.default = ShiftAssignmentModel;
