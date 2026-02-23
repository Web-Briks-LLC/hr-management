import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from "date-fns";
import ExpenseModel from "../models/expense.model.js";
import ExpenseCategoryModel from "../models/expense-category.model.js";
import type {
    IExpense,
    IExpenseCategory,
    ExpenseQueryParams,
    ExpenseStats,
} from "../types/expense.type.js";

// Aggregation pipeline for expenses with lookups
const getExpenseAggregationPipeline = (
    matchStage: any,
    skip: number,
    limit: number,
    sortStage: any,
): PipelineStage[] => [
    { $match: matchStage },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
    // Lookup Category
    {
        $lookup: {
            from: "expensecategories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
        },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    // Lookup Branch
    {
        $lookup: {
            from: "branches",
            localField: "branchId",
            foreignField: "_id",
            as: "branch",
        },
    },
    { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
    // Lookup CreatedBy
    {
        $lookup: {
            from: "user",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
        },
    },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    // Cleanup
    {
        $project: {
            categoryId: 0,
            branchId: 0,
            "createdBy.password": 0,
        },
    },
];

// Build date filter based on filterType
const buildDateFilter = (params: ExpenseQueryParams): any => {
    const filter: any = {};
    const now = new Date();

    switch (params.filterType) {
        case "today":
            filter.date = {
                $gte: startOfDay(now),
                $lte: endOfDay(now),
            };
            break;
        case "week":
            filter.date = {
                $gte: startOfWeek(now, { weekStartsOn: 0 }),
                $lte: endOfWeek(now, { weekStartsOn: 0 }),
            };
            break;
        case "month":
            if (params.month && params.year) {
                const monthStart = new Date(params.year, params.month - 1, 1);
                const monthEnd = endOfMonth(monthStart);
                filter.date = {
                    $gte: monthStart,
                    $lte: monthEnd,
                };
            } else {
                filter.date = {
                    $gte: startOfMonth(now),
                    $lte: endOfMonth(now),
                };
            }
            break;
        case "year":
            if (params.year) {
                filter.date = {
                    $gte: new Date(params.year, 0, 1),
                    $lte: new Date(params.year, 11, 31, 23, 59, 59, 999),
                };
            } else {
                filter.date = {
                    $gte: startOfYear(now),
                    $lte: endOfYear(now),
                };
            }
            break;
        case "range":
            if (params.startDate || params.endDate) {
                filter.date = {};
                if (params.startDate) {
                    filter.date.$gte = startOfDay(new Date(params.startDate));
                }
                if (params.endDate) {
                    filter.date.$lte = endOfDay(new Date(params.endDate));
                }
            }
            break;
    }

    return filter;
};

// Build match stage from query params
const buildMatchStage = (params: ExpenseQueryParams): any => {
    const match: any = {};

    if (params.search) {
        match.title = { $regex: params.search, $options: "i" };
    }

    if (params.branchId && Types.ObjectId.isValid(params.branchId)) {
        match.branchId = new Types.ObjectId(params.branchId);
    }

    if (params.categoryId && Types.ObjectId.isValid(params.categoryId)) {
        match.categoryId = new Types.ObjectId(params.categoryId);
    }

    if (params.staffId && Types.ObjectId.isValid(params.staffId)) {
        match.staffId = new Types.ObjectId(params.staffId);
    }

    if (params.status && params.status !== "all") {
        match.status = params.status;
    }

    // Add date filter
    const dateFilter = buildDateFilter(params);
    Object.assign(match, dateFilter);

    return match;
};

// Get all expenses with pagination and filtering
const getAllExpensesFromDB = async (params: ExpenseQueryParams) => {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const sortField = params.sortBy || "date";
    const sortOrder = params.sortOrder === "asc" ? 1 : -1;
    const sortStage: any = { [sortField]: sortOrder };

    const matchStage = buildMatchStage(params);

    const [expenses, countResult] = await Promise.all([
        ExpenseModel.aggregate(
            getExpenseAggregationPipeline(matchStage, skip, limit, sortStage),
        ),
        ExpenseModel.countDocuments(matchStage),
    ]);

    return {
        expenses,
        pagination: {
            page,
            limit,
            total: countResult,
            pages: Math.ceil(countResult / limit),
        },
    };
};

// Get expense statistics
const getExpenseStatsFromDB = async (
    branchId?: string,
    year?: number,
    month?: number,
): Promise<ExpenseStats> => {
    const now = new Date();

    // Determine the reference date based on inputs or use current date
    const targetYear = year || now.getFullYear();
    const targetMonth = month ? month - 1 : now.getMonth(); // input month is 1-based

    // Calculate ranges
    // Today is always actual today (or we could make it relative to selected month? keeping actual today for now)
    const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    );
    const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
    );

    // Selected Month Range
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(
        targetYear,
        targetMonth + 1,
        0,
        23,
        59,
        59,
        999,
    );

    // Selected Year Range
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const branchMatch = branchId
        ? { branchId: new Types.ObjectId(branchId) }
        : {};

    const [statsResult] = await ExpenseModel.aggregate([
        { $match: { ...branchMatch } },
        {
            $facet: {
                today: [
                    {
                        $match: {
                            date: { $gte: startOfToday, $lte: endOfToday },
                        },
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
                thisMonth: [
                    {
                        $match: {
                            date: { $gte: startOfMonth, $lte: endOfMonth },
                        },
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
                thisYear: [
                    {
                        $match: {
                            date: { $gte: startOfYear, $lte: endOfYear },
                        },
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ],
            },
        },
    ]);

    const todayTotal = statsResult.today[0]?.total || 0;
    const monthTotal = statsResult.thisMonth[0]?.total || 0;
    const yearTotal = statsResult.thisYear[0]?.total || 0;

    // Calculate average monthly expense for the year
    let monthsPassed = 12;
    if (targetYear === now.getFullYear()) {
        monthsPassed = now.getMonth() + 1;
    } else if (targetYear > now.getFullYear()) {
        monthsPassed = 0;
    }

    const avgMonthly = monthsPassed > 0 ? yearTotal / monthsPassed : 0;

    return {
        today: todayTotal,
        thisMonth: monthTotal,
        thisYear: yearTotal,
        avgMonthly: Math.round(avgMonthly * 100) / 100,
    };
};

// Get available expense years
const getAvailableExpenseYearsFromDB = async () => {
    const result = await ExpenseModel.aggregate([
        {
            $group: {
                _id: { $year: "$date" },
            },
        },
        {
            $sort: { _id: -1 },
        },
        {
            $project: {
                _id: 0,
                year: "$_id",
            },
        },
    ]);
    return result.map((r) => r.year);
};

// Create expense
const createExpenseInDB = async (
    payload: Partial<IExpense> & { createdBy: string },
) => {
    const result = await ExpenseModel.create(payload);
    return result;
};

// Get expense by ID
const getExpenseByIdFromDB = async (id: string) => {
    const result = await ExpenseModel.aggregate(
        getExpenseAggregationPipeline({ _id: new Types.ObjectId(id) }, 0, 1, {
            date: -1,
        }),
    );
    return result[0] || null;
};

// Update expense
const updateExpenseInDB = async (id: string, payload: Partial<IExpense>) => {
    const result = await ExpenseModel.findByIdAndUpdate(id, payload, {
        new: true,
    });
    return result;
};

// Delete expense
const deleteExpenseFromDB = async (id: string) => {
    const result = await ExpenseModel.findByIdAndDelete(id);
    return result;
};

// ===== CATEGORY OPERATIONS =====

// Get all categories
const getAllCategoriesFromDB = async () => {
    const result = await ExpenseCategoryModel.find({ isActive: true }).sort({
        name: 1,
    });
    return result;
};

// Create category
const createCategoryInDB = async (payload: Partial<IExpenseCategory>) => {
    const result = await ExpenseCategoryModel.create(payload);
    return result;
};

// Update category
const updateCategoryInDB = async (
    id: string,
    payload: Partial<IExpenseCategory>,
) => {
    const result = await ExpenseCategoryModel.findByIdAndUpdate(id, payload, {
        new: true,
    });
    return result;
};

// Delete category (soft delete)
const deleteCategoryFromDB = async (id: string) => {
    const result = await ExpenseCategoryModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true },
    );
    return result;
};

export default {
    getAllExpensesFromDB,
    getAvailableExpenseYearsFromDB,
    getExpenseStatsFromDB,
    createExpenseInDB,
    getExpenseByIdFromDB,
    updateExpenseInDB,
    deleteExpenseFromDB,
    getAllCategoriesFromDB,
    createCategoryInDB,
    updateCategoryInDB,
    deleteCategoryFromDB,
};
