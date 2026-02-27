import { Router } from "express";
import AttendanceController from "../controllers/attendance.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router: Router = Router();

router.post("/check-in", AttendanceController.checkIn);
router.post("/check-out", AttendanceController.checkOut);

router.get("/today", AttendanceController.getTodayAttendance);
router.get("/monthly-stats", AttendanceController.getMonthlyStats);
router.get("/my-history", AttendanceController.getMyAttendanceHistory);

// Admin routes
router.get(
    "/admin/all",
    authorize(
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.HR_MANAGER,
        Role.TEAM_LEADER,
        Role.STAFF,
    ),
    AttendanceController.getAllAttendance,
);

router.patch(
    "/admin/:id",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    AttendanceController.updateAttendanceStatus,
);

export const attendanceRoute = router;
