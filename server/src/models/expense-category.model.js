"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var expenseCategorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
var ExpenseCategoryModel = (0, mongoose_1.model)('ExpenseCategory', expenseCategorySchema);
exports.default = ExpenseCategoryModel;
