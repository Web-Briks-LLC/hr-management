import type { Request, Response } from "express";
import ExpenseServices from "../services/expense.service.js";
import type { ExpenseQueryParams } from "../types/expense.type.js";

// ===== EXPENSE CONTROLLERS =====

const getAllExpenses = async (req: Request, res: Response) => {
    try {
        const userRole = req.user?.role;
        const userId = req.user?.id as string;
        if (!userId) throw new Error("Unauthorized");

        let queryStaffId = req.query.staffId as string;

        if (userRole === "staff" || userRole === "team_leader") {
            const StaffModel = (await import("../models/staff.model.js"))
                .default;
            const staff = await StaffModel.findOne({ userId });
            if (!staff) throw new Error("Staff record not found");
            queryStaffId = String(staff._id);
        }

        const params: ExpenseQueryParams = {
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
            search: req.query.search as string,
            sortBy: req.query.sortBy as string,
            sortOrder: req.query.sortOrder as "asc" | "desc",
            ...(req.query.month
                ? { month: parseInt(req.query.month as string) }
                : {}),
            ...(req.query.year
                ? { year: parseInt(req.query.year as string) }
                : {}),
            branchId: req.query.branchId as string,
            categoryId: req.query.categoryId as string,
            staffId: queryStaffId,
            status: req.query.status as string,
            filterType: req.query.filterType as any,
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
        };

        const result = await ExpenseServices.getAllExpensesFromDB(params);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expenses",
        });
    }
};

const getExpenseYears = async (_req: Request, res: Response) => {
    try {
        const result = await ExpenseServices.getAvailableExpenseYearsFromDB();
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expense years",
        });
    }
};

const getExpenseStats = async (req: Request, res: Response) => {
    try {
        const branchId = req.query.branchId as string | undefined;
        let year: number | undefined;
        let month: number | undefined;

        if (req.query.year) {
            const parsedYear = parseInt(req.query.year as string);
            if (!isNaN(parsedYear)) year = parsedYear;
        }

        if (req.query.month) {
            const parsedMonth = parseInt(req.query.month as string);
            if (!isNaN(parsedMonth)) month = parsedMonth;
        }

        const result = await ExpenseServices.getExpenseStatsFromDB(
            branchId,
            year,
            month,
        );
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expense stats",
        });
    }
};

const createExpense = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result = await ExpenseServices.createExpenseInDB({
            ...req.body,
            createdBy: userId,
        });

        res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create expense",
        });
    }
};

const getExpenseById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        const result = await ExpenseServices.getExpenseByIdFromDB(id);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expense",
        });
    }
};

const updateExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        const result = await ExpenseServices.updateExpenseInDB(id, req.body);
        res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update expense",
        });
    }
};

const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        await ExpenseServices.deleteExpenseFromDB(id);
        res.status(200).json({
            success: true,
            message: "Expense deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete expense",
        });
    }
};

// ===== CATEGORY CONTROLLERS =====

const getAllCategories = async (_req: Request, res: Response) => {
    try {
        const result = await ExpenseServices.getAllCategoriesFromDB();
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch categories",
        });
    }
};

const createCategory = async (req: Request, res: Response) => {
    try {
        const result = await ExpenseServices.createCategoryInDB(req.body);
        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create category",
        });
    }
};

const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        const result = await ExpenseServices.updateCategoryInDB(id, req.body);
        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update category",
        });
    }
};

const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        await ExpenseServices.deleteCategoryFromDB(id);
        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete category",
        });
    }
};

export default {
    getAllExpenses,
    getExpenseYears,
    getExpenseStats,
    createExpense,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};
