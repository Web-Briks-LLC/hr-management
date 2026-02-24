import type { Request, Response } from 'express';
import AttendanceServices from '../services/attendance.service.js';

const checkIn = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || '';

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        if (!ip) {
            return res.status(400).json({
                success: false,
                message: 'IP address is required',
            });
        }

        await AttendanceServices.checkInInDB({
            userId,
            ip,
            userAgent,
            source: 'web',
        });

        return res.status(200).json({
            success: true,
            message: 'Checked in successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message || 'Failed to check in',
        });
    }
};

async function checkOut(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || '';

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        if (!ip) {
            return res.status(400).json({
                success: false,
                message: 'IP address is required',
            });
        }

        const result = await AttendanceServices.checkOutInDB({
            userId,
            ip,
            userAgent,
            source: 'web',
        });

        return res.status(200).json({
            success: true,
            message: 'Checked out successfully',
            attendanceDay: result.attendanceDay,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message || 'Failed to check out',
        });
    }
}

async function getTodayAttendance(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
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
        if (!userId) throw new Error('Unauthorized');

        const result = await AttendanceServices.getMonthlyStatsInDB(userId);
        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch monthly stats',
        });
    }
};

const getMyAttendanceHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

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
            message: error.message || 'Failed to fetch attendance history',
        });
    }
};

const getAllAttendance = async (req: Request, res: Response) => {
    try {
        const {
            startDate,
            endDate,
            staffId,
            status,
            branchId,
            page = '1',
            limit = '50',
        } = req.query;

        const result = await AttendanceServices.getAllAttendanceFromDB({
            startDate: startDate as string,
            endDate: endDate as string,
            staffId: staffId as string,
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
        console.error('Error in getAllAttendance:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch attendance records',
        });
    }
};

const updateAttendanceStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const updatedBy = req.user?.id;

        if (!updatedBy) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const result = await AttendanceServices.updateAttendanceStatusInDB({
            attendanceId: id as string,
            status,
            notes,
            updatedBy,
        });

        return res.status(200).json({
            success: true,
            message: 'Attendance status updated successfully',
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message || 'Failed to update attendance status',
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
};
export default AttendanceController;
