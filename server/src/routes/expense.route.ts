import { Router } from "express";
import ExpenseController from "../controllers/expense.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router: Router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// Expense routes (static paths first)
router.get(
    "/",
    authorize(...allowedRoles, Role.TEAM_LEADER, Role.STAFF),
    ExpenseController.getAllExpenses,
);
router.get(
    "/stats",
    authorize(...allowedRoles),
    ExpenseController.getExpenseStats,
);
router.post("/", authorize(...allowedRoles), ExpenseController.createExpense);

// Category routes (must be before /:id to avoid matching 'categories' as an id)
router.get(
    "/categories",
    authorize(...allowedRoles),
    ExpenseController.getAllCategories,
);
router.post(
    "/categories",
    authorize(...allowedRoles),
    ExpenseController.createCategory,
);
router.patch(
    "/categories/:id",
    authorize(...allowedRoles),
    ExpenseController.updateCategory,
);
router.delete(
    "/categories/:id",
    authorize(...allowedRoles),
    ExpenseController.deleteCategory,
);

router.get("/years", ExpenseController.getExpenseYears);

// Expense routes with :id parameter (last, to catch remaining)
router.get(
    "/:id",
    authorize(...allowedRoles),
    ExpenseController.getExpenseById,
);
router.patch(
    "/:id",
    authorize(...allowedRoles),
    ExpenseController.updateExpense,
);
router.delete(
    "/:id",
    authorize(...allowedRoles),
    ExpenseController.deleteExpense,
);

export const expenseRoute = router;
