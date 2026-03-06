"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var designation_js_1 = require("../constants/designation.js");
var StaffSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    },
    staffId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    branchId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Branch',
        required: false, // Optional for admin roles
        index: true,
    },
    department: {
        type: String,
        // Dynamic values from metadata, no enum restriction
        index: true,
    },
    designation: {
        type: String,
        enum: Object.values(designation_js_1.Designation),
        required: true,
        index: true,
    },
    joinDate: {
        type: Date,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'terminated'],
        default: 'active',
        index: true,
    },
    dateOfBirth: {
        type: Date,
        required: false,
    },
    nationalId: {
        type: String,
        required: false,
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: false,
    },
    address: {
        type: String,
        required: false,
    },
    emergencyContact: {
        name: {
            type: String,
            required: false,
        },
        relation: {
            type: String,
            required: false,
        },
        phone: {
            type: String,
            required: false,
        },
    },
    fathersName: {
        type: String,
        required: false,
    },
    mothersName: {
        type: String,
        required: false,
    },
    spouseName: {
        type: String,
        required: false,
    },
    bank: {
        bankName: { type: String, required: false },
        accountNumber: { type: String, required: false },
        accountHolderName: { type: String, required: false },
        branch: { type: String, required: false },
        routingNumber: { type: String, required: false },
    },
    exitDate: {
        type: Date,
    },
    salary: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        index: true,
    },
    salaryVisibleToEmployee: {
        type: Boolean,
        default: true,
    },
    profileCompleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    salaryPin: {
        type: String,
        required: false,
        select: false, // Do not return by default
    },
    salaryPinResetToken: {
        type: String,
        select: false,
    },
    salaryPinResetExpires: {
        type: Date,
        select: false,
    },
    balance: {
        type: Number,
        default: 0,
        index: true,
    },
}, {
    timestamps: true,
});
StaffSchema.index({ userId: 1 }, {
    unique: true,
    partialFilterExpression: { userId: { $exists: true, $ne: null } },
});
var StaffModel = (0, mongoose_1.model)('Staff', StaffSchema);
exports.default = StaffModel;
