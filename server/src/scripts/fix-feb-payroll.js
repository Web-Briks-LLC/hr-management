"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var dotenv_1 = require("dotenv");
var date_fns_1 = require("date-fns");
var staff_model_js_1 = require("../models/staff.model.js");
var attendance_day_model_js_1 = require("../models/attendance-day.model.js");
var shift_assignment_model_js_1 = require("../models/shift-assignment.model.js");
var expense_model_js_1 = require("../models/expense.model.js");
var expense_category_model_js_1 = require("../models/expense-category.model.js");
var shift_model_js_1 = require("../models/shift.model.js");
dotenv_1.default.config();
var uri = process.env.OFFICE_MONGO_URI;
/**
 * Recalculates February 2026 data for all active staff,
 * creating missing "absent" punches so the Grace UI works
 * natively, and updating their final paid Expense.
 */
function fixAllFebruaryData() {
    return __awaiter(this, void 0, void 0, function () {
        var year, monthNum, startDate, endDate, staffs, salaryCategory, daysInMonth, modifiedEmployees, upsertedAttendances, modifiedExpenses, _loop_1, _i, staffs_1, staff, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, mongoose_1.default.connect(uri)];
                case 1:
                    _c.sent();
                    console.log('Connected to office DB for complete February 2026 fix.');
                    year = 2026;
                    monthNum = 2;
                    startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
                    endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
                    return [4 /*yield*/, staff_model_js_1.default.find({
                            $or: [{ status: 'active' }, { exitDate: { $gte: startDate } }],
                        })];
                case 2:
                    staffs = _c.sent();
                    console.log("Found ".concat(staffs.length, " relevant staff members to check for February."));
                    return [4 /*yield*/, expense_category_model_js_1.default.findOne({
                            name: /^Salary/i,
                        })];
                case 3:
                    salaryCategory = _c.sent();
                    if (!salaryCategory) {
                        console.log('No Salary category found, aborting.');
                        return [2 /*return*/, process.exit(1)];
                    }
                    daysInMonth = (0, date_fns_1.eachDayOfInterval)({
                        start: startDate,
                        end: endDate,
                    });
                    modifiedEmployees = 0;
                    upsertedAttendances = 0;
                    modifiedExpenses = 0;
                    _loop_1 = function (staff) {
                        var shiftAssignment, shift, _d, existingAttendance, expectedWorkDates, unemployedDays, joinDate, exitDate, missingPunches, todayUTC, missingDatesToCreate, _e, missingDatesToCreate_1, missingDate, literalAbsentDays, finalAbsentDays, staffSalary, perDaySalary, serverDeduction, expectedPayable, expectedRounded, expense, bonus, deduction, bonusMatch, deductionMatch, correctFinalPaid, staffName;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0: return [4 /*yield*/, shift_assignment_model_js_1.default.findOne({
                                        staffId: staff._id,
                                        isActive: true,
                                    })];
                                case 1:
                                    shiftAssignment = _f.sent();
                                    if (!shiftAssignment) return [3 /*break*/, 3];
                                    return [4 /*yield*/, shift_model_js_1.default.findById(shiftAssignment.shiftId)];
                                case 2:
                                    _d = _f.sent();
                                    return [3 /*break*/, 4];
                                case 3:
                                    _d = null;
                                    _f.label = 4;
                                case 4:
                                    shift = _d;
                                    return [4 /*yield*/, attendance_day_model_js_1.default.find({
                                            staffId: staff._id,
                                            date: { $gte: startDate, $lte: endDate },
                                        })];
                                case 5:
                                    existingAttendance = _f.sent();
                                    expectedWorkDates = [];
                                    if (shift) {
                                        daysInMonth.forEach(function (day) {
                                            if (shift.workDays.includes(day.getDay())) {
                                                expectedWorkDates.push(day);
                                            }
                                        });
                                    }
                                    unemployedDays = 0;
                                    joinDate = staff.joinDate ? new Date(staff.joinDate) : null;
                                    exitDate = staff.exitDate ? new Date(staff.exitDate) : null;
                                    daysInMonth.forEach(function (day) {
                                        var isBeforeJoin = joinDate && day < joinDate;
                                        var isAfterExit = exitDate && day > exitDate;
                                        if (isBeforeJoin || isAfterExit) {
                                            unemployedDays++;
                                        }
                                    });
                                    missingPunches = 0;
                                    todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
                                    missingDatesToCreate = [];
                                    if (shift) {
                                        expectedWorkDates.forEach(function (day) {
                                            if (day > todayUTC)
                                                return; // Future
                                            var isBeforeJoin = joinDate && day < joinDate;
                                            var isAfterExit = exitDate && day > exitDate;
                                            if (isBeforeJoin || isAfterExit)
                                                return;
                                            var hasRecord = existingAttendance.some(function (a) { return new Date(a.date).getTime() === day.getTime(); });
                                            if (!hasRecord) {
                                                missingPunches++;
                                                missingDatesToCreate.push(day);
                                            }
                                        });
                                    }
                                    _e = 0, missingDatesToCreate_1 = missingDatesToCreate;
                                    _f.label = 6;
                                case 6:
                                    if (!(_e < missingDatesToCreate_1.length)) return [3 /*break*/, 9];
                                    missingDate = missingDatesToCreate_1[_e];
                                    if (!(shift === null || shift === void 0 ? void 0 : shift._id))
                                        return [3 /*break*/, 8];
                                    return [4 /*yield*/, attendance_day_model_js_1.default.create({
                                            staffId: staff._id,
                                            shiftId: shift._id,
                                            date: missingDate,
                                            status: 'absent',
                                            isAutoAbsent: true,
                                            notes: '[Auto Generated Missing Punch]',
                                        })];
                                case 7:
                                    _f.sent();
                                    upsertedAttendances++;
                                    _f.label = 8;
                                case 8:
                                    _e++;
                                    return [3 /*break*/, 6];
                                case 9:
                                    literalAbsentDays = existingAttendance.filter(function (a) { return a.status === 'absent'; }).length;
                                    finalAbsentDays = literalAbsentDays + missingPunches;
                                    staffSalary = staff.salary || 0;
                                    perDaySalary = staffSalary / 30;
                                    serverDeduction = (finalAbsentDays + unemployedDays) * perDaySalary;
                                    expectedPayable = Math.max(0, staffSalary - serverDeduction);
                                    expectedRounded = Math.round(expectedPayable);
                                    return [4 /*yield*/, expense_model_js_1.default.findOne({
                                            categoryId: salaryCategory._id,
                                            staffId: staff._id,
                                            date: { $gte: startDate, $lte: endDate },
                                        })];
                                case 10:
                                    expense = _f.sent();
                                    if (!expense) return [3 /*break*/, 12];
                                    bonus = 0;
                                    deduction = 0;
                                    bonusMatch = (_a = expense.note) === null || _a === void 0 ? void 0 : _a.match(/Bonus:\s+(\d+)/);
                                    if (bonusMatch && bonusMatch[1])
                                        bonus = parseInt(bonusMatch[1]);
                                    deductionMatch = (_b = expense.note) === null || _b === void 0 ? void 0 : _b.match(/Deduction:\s+(\d+)/);
                                    if (deductionMatch && deductionMatch[1])
                                        deduction = parseInt(deductionMatch[1]);
                                    correctFinalPaid = expectedRounded + bonus - deduction;
                                    if (!(expense.amount !== correctFinalPaid)) return [3 /*break*/, 12];
                                    staffName = staff.name || staff.staffId;
                                    console.log("Fixing payment for ".concat(staffName, " | Base: ").concat(expectedRounded, " | Fix: ").concat(expense.amount, " -> ").concat(correctFinalPaid));
                                    expense.amount = correctFinalPaid;
                                    return [4 /*yield*/, expense.save()];
                                case 11:
                                    _f.sent();
                                    modifiedExpenses++;
                                    _f.label = 12;
                                case 12:
                                    if (missingDatesToCreate.length > 0 ||
                                        (expense && expense.isModified('amount'))) {
                                        modifiedEmployees++;
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, staffs_1 = staffs;
                    _c.label = 4;
                case 4:
                    if (!(_i < staffs_1.length)) return [3 /*break*/, 7];
                    staff = staffs_1[_i];
                    return [5 /*yield**/, _loop_1(staff)];
                case 5:
                    _c.sent();
                    _c.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log("\n=== FIX REPORT ===");
                    console.log("Employees Processed/Fixed: ".concat(modifiedEmployees));
                    console.log("Missing Absent Punches Generated: ".concat(upsertedAttendances));
                    console.log("Expense Payouts Corrected: ".concat(modifiedExpenses));
                    console.log("==================\n");
                    process.exit(0);
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _c.sent();
                    console.error('Error fixing Feb data:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
fixAllFebruaryData();
