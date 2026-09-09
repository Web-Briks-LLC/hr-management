import type { Request, Response } from "express";
import AttendanceServices from "../services/attendance.service.js";

const checkIn = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const ip = req.ip;
        const userAgent = req.headers["user-agent"] || "";

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!ip) {
            return res.status(400).json({
                success: false,
                message: "IP address is required",
            });
        }

        await AttendanceServices.checkInInDB({
            userId,
            ip,
            userAgent,
            source: "web",
        });

        return res.status(200).json({
            success: true,
            message: "Checked in successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message || "Failed to check in",
        });
    }
};

async function checkOut(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const ip = req.ip;
        const userAgent = req.headers["user-agent"] || "";

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!ip) {
            return res.status(400).json({
                success: false,
                message: "IP address is required",
            });
        }

        const result = await AttendanceServices.checkOutInDB({
            userId,
            ip,
            userAgent,
            source: "web",
        });

        return res.status(200).json({
            success: true,
            message: "Checked out successfully",
            attendanceDay: result.attendanceDay,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message || "Failed to check out",
        });
    }
}

async function getTodayAttendance(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const attendance =
            await AttendanceServices.getTodayAttendanceFromDB(userId);

        return res.status(200).json({
            success: true,
            attendance,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to fetch today's attendance. Please try again.",
        });
    }
}

const getMonthlyStats = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result = await AttendanceServices.getMonthlyStatsInDB(userId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch monthly stats",
        });
    }
};

const getMyAttendanceHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const days = parseInt(req.query.days as string) || 7;
        const result = await AttendanceServices.getMyAttendanceHistoryInDB(
            userId,
            days,
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch attendance history",
        });
    }
};

const getAllAttendance = async (req: Request, res: Response) => {
    try {
        const userRole = req.user?.role;
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        let queryStaffId = req.query.staffId as string;
        let scopedStaffIds: string[] | undefined;

        if (userRole === "staff") {
            // Plain staff only ever see their own attendance.
            const StaffModel = (await import("../models/staff.model.js"))
                .default;
            const staff = await StaffModel.findOne({ userId });
            if (!staff) throw new Error("Staff record not found");
            queryStaffId = (staff as any)._id.toString();
        } else if (userRole === "team_leader") {
            // Team leaders see every staff member in their own branch.
            const StaffModel = (await import("../models/staff.model.js"))
                .default;
            const me = await StaffModel.findOne({ userId }).select("branchId");
            if (!me) throw new Error("Staff record not found");

            if ((me as any).branchId) {
                const branchStaff = await StaffModel.find({
                    branchId: (me as any).branchId,
                }).select("_id");
                scopedStaffIds = branchStaff.map((s) => (s as any)._id.toString());
            } else {
                // No branch on the profile → fall back to own record only.
                scopedStaffIds = [(me as any)._id.toString()];
            }
        }

        const {
            startDate,
            endDate,
            status,
            branchId,
            page = "1",
            limit = "50",
        } = req.query;

        const result = await AttendanceServices.getAllAttendanceFromDB({
            startDate: startDate as string,
            endDate: endDate as string,
            staffId: queryStaffId,
            staffIds: scopedStaffIds,
            status: status as string,
            branchId: branchId as string,
            page: parseInt(page as string) || 1,
            limit: parseInt(limit as string) || 50,
            search: req.query.search as string,
        });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error("Error in getAllAttendance:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch attendance records",
        });
    }
};

const updateAttendanceStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const updatedBy = req.user?.id;
        const userRole = req.user?.role;

        if (!updatedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        // Team leaders may only edit attendance for staff in their own branch.
        if (userRole === "team_leader") {
            const StaffModel = (await import("../models/staff.model.js"))
                .default;
            const AttendanceDayModel = (
                await import("../models/attendance-day.model.js")
            ).default;

            const me = await StaffModel.findOne({ userId: updatedBy }).select(
                "branchId",
            );
            if (!me || !(me as any).branchId) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to a branch",
                });
            }

            const record = await AttendanceDayModel.findById(id).select(
                "staffId",
            );
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: "Attendance record not found",
                });
            }

            const targetStaff = await StaffModel.findById(
                (record as any).staffId,
            ).select("branchId");
            if (
                !targetStaff ||
                String((targetStaff as any).branchId) !==
                    String((me as any).branchId)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You can only update attendance for staff in your own branch",
                });
            }
        }

        const result = await AttendanceServices.updateAttendanceStatusInDB({
            attendanceId: id as string,
            status,
            notes,
            updatedBy,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json({
            success: true,
            message: "Attendance status updated successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to update attendance status",
        });
    }
};

const bulkUpdateAttendanceStatus = async (req: Request, res: Response) => {
    try {
        const { staffIds, date, status, notes, shiftId } = req.body;
        const updatedBy = req.user?.id;

        if (!updatedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "staffIds array is required",
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "date is required",
            });
        }

        const result = await AttendanceServices.bulkUpdateAttendanceStatusInDB({
            staffIds,
            date,
            status: status || 'present',
            notes,
            shiftId,
            updatedBy,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json({
            success: true,
            message: "Bulk attendance status updated successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to update attendance status in bulk",
        });
    }
};

const AttendanceController = {
    checkIn,
    checkOut,
    getTodayAttendance,
    getMonthlyStats,
    getMyAttendanceHistory,
    getAllAttendance,
    updateAttendanceStatus,
    bulkUpdateAttendanceStatus,
};
export default AttendanceController;
