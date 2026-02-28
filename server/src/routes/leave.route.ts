import { Router } from "express";
import {
    applyForLeave,
    getAllLeaveApplications,
    getPendingLeaves,
    getMyLeaveApplications,
    getLeaveApplicationById,
    getLeaveBalance,
    approveLeave,
    rejectLeave,
    revokeLeave,
    cancelLeaveApplication,
    calculateWorkingDays,
    uploadMedicalDocument,
} from "../controllers/leave.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router = Router();

const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];
const allRoles = [...adminRoles, Role.TEAM_LEADER, Role.STAFF];

// Staff routes — any authenticated user can apply for leave and view their own
router.post("/", authorize(...allRoles), applyForLeave);
router.get("/my", authorize(...allRoles), getMyLeaveApplications);
router.get("/balance", authorize(...allRoles), getLeaveBalance);
router.get("/balance/:staffId", authorize(...allRoles), getLeaveBalance);
router.get("/calculate-days", authorize(...allRoles), calculateWorkingDays);
router.patch("/:id/cancel", authorize(...allRoles), cancelLeaveApplication);
router.post(
    "/:id/upload-document",
    authorize(...allRoles),
    upload.single("document"),
    uploadMedicalDocument,
);

// Admin routes — only managers and admins can approve/reject/revoke
router.get("/", authorize(...adminRoles), getAllLeaveApplications);
router.get("/pending", authorize(...adminRoles), getPendingLeaves);
router.get("/:id", authorize(...adminRoles), getLeaveApplicationById);
router.patch("/:id/approve", authorize(...adminRoles), approveLeave);
router.patch("/:id/reject", authorize(...adminRoles), rejectLeave);
router.patch("/:id/revoke", authorize(...adminRoles), revokeLeave);

export { router as leaveRoute };
