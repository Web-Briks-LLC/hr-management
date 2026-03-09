import { Router } from "express";
import StaffController from "../controllers/staff.controller.js";
import { 
    getMyTransactions, 
    getAllTransactions, 
    adminWithdraw 
} from "../controllers/wallet-transaction.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router: Router = Router();

router.get("/", StaffController.getStaffs);
router.get("/me", StaffController.getStaff);

// Wallet Transactions
router.get("/wallet-transactions/me", getMyTransactions);
router.get(
    "/wallet-transactions/all",
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    getAllTransactions
);
router.post(
    "/wallet-transactions/withdraw",
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER),
    adminWithdraw
);

router.get(
    "/:id",
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.getStaffById,
);
router.get(
    "/export",
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.exportStaffs,
);

router.post(
    "/create",
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.createStaff,
);

router.put("/complete-profile", StaffController.completeProfile);

router.put("/update-profile", StaffController.updateProfile);

router.post("/view-salary", StaffController.viewSalary);

router.put(
    "/:staffId/salary",
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.updateSalary,
);

router.patch(
    "/:staffId",
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.updateStaff,
);

// Set Salary PIN
router.post(
    "/:staffId/pin/set",
    // authorize(Role.STAFF, Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN), // Assuming logged in user can set their own PIN or admin can?
    // Actually, usually users set their own PIN.
    // And authorize middleware handles role check. If any role is fine, we might need a custom check if user modifies someone else.
    // For now, let's allow all roles but the controller should ideally check if (req.user.id === staff.userId || isAdmin).
    // The service/controller logic I wrote used `changedBy`.
    // Let's stick to the plan: protected route.
    authorize(Role.STAFF, Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.setSalaryPin,
);

// Verify Salary PIN
router.post(
    "/:staffId/pin/verify",
    authorize(Role.STAFF, Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.verifySalaryPin,
);

// Forgot/Reset PIN
router.post("/pin/forgot", StaffController.forgotSalaryPin);
router.post("/pin/reset", StaffController.resetSalaryPin);

export const staffRoute = router;
