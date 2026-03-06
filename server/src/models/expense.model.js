"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var expenseSchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    categoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ExpenseCategory",
        required: true,
        index: true,
    },
    branchId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true,
    },
    staffId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Staff",
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["pending", "paid", "partial_paid"],
        default: "pending",
        index: true,
    },
    paymentMethod: {
        type: String,
        default: "cash",
    },
    note: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });
// Compound index for efficient date range queries
expenseSchema.index({ date: -1, branchId: 1 });
// Prevent duplicate payroll payments for same staff + category + month
expenseSchema.index({ staffId: 1, categoryId: 1, date: 1 }, { sparse: true });
var ExpenseModel = (0, mongoose_1.model)("Expense", expenseSchema);
exports.default = ExpenseModel;
