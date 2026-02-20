import { Router } from "express";
import payrollController from "../controllers/payroll.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";
import {
    validate,
    payrollPreviewSchema,
    processPaymentSchema,
    bulkProcessSchema,
    graceSchema,
    absentDatesSchema,
    undoPaymentSchema,
    lockMonthSchema,
} from "../validators/payroll.validator.js";

const router: Router = Router();

const readAccess = authorize(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HR_MANAGER,
    Role.TEAM_LEADER,
);
const writeAccess = authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER);

// Preview
router.get(
    "/preview",
    readAccess,
    validate(payrollPreviewSchema, "query"),
    payrollController.getPayrollPreview,
);

// Payments
router.post(
    "/process",
    writeAccess,
    validate(processPaymentSchema),
    payrollController.processPayment,
);
router.post(
    "/bulk-process",
    writeAccess,
    validate(bulkProcessSchema),
    payrollController.bulkProcessPayment,
);

// Grace attendance
router.post(
    "/grace",
    writeAccess,
    validate(graceSchema),
    payrollController.graceAttendance,
);

// Absent dates
router.get(
    "/absent-dates",
    readAccess,
    validate(absentDatesSchema, "query"),
    payrollController.getAbsentDates,
);

// Undo
router.post(
    "/undo",
    writeAccess,
    validate(undoPaymentSchema),
    payrollController.undoPayment,
);

// Payroll Lock
router.get("/lock-status", readAccess, payrollController.getLockStatus);
router.post(
    "/lock",
    writeAccess,
    validate(lockMonthSchema),
    payrollController.lockMonth,
);
router.post(
    "/unlock",
    writeAccess,
    validate(lockMonthSchema),
    payrollController.unlockMonth,
);

export const payrollRoute = router;
