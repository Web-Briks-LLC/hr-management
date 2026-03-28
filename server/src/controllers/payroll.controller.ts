import type { Request, Response } from "express";
import payrollService from "../services/payroll.service.js";

const getPayrollPreview = async (req: Request, res: Response) => {
    try {
        const { month, branchId } = (req as any).validatedQuery;

        const data = await payrollService.getPayrollPreview({
            month,
            branchId,
        });

        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const processPayment = async (req: Request, res: Response) => {
    try {
        const {
            staffId,
            month,
            amount,
            paymentMethod,
            note,
            bonus,
            deduction,
            paymentType,
        } = req.body;

        const result = await payrollService.processPayroll({
            staffId,
            month,
            amount,
            paymentMethod,
            note,
            bonus,
            deduction,
            createdBy: (req as any).user.id || (req as any).user._id,
            paymentType,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json({
            success: true,
            message: "Payment processed successfully",
            data: result,
        });
    } catch (error: any) {
        const status = error.message.includes("locked") ? 400 : 500;
        return res
            .status(status)
            .json({ success: false, message: error.message });
    }
};

const bulkProcessPayment = async (req: Request, res: Response) => {
    try {
        const { month, payments, paymentMethod, paymentType } = req.body;
        const userId = (req as any).user.id || (req as any).user._id;

        const result = await payrollService.bulkProcessPayment({
            month,
            payments,
            paymentMethod,
            createdBy: userId,
            paymentType,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json({
            success: true,
            message: "Bulk processing completed",
            data: result,
        });
    } catch (error: any) {
        const status = error.message.includes("locked") ? 400 : 500;
        return res
            .status(status)
            .json({ success: false, message: error.message });
    }
};

const graceAttendance = async (req: Request, res: Response) => {
    try {
        const { staffId, dates, note } = req.body;

        const result = await payrollService.graceAttendance(
            staffId,
            dates,
            {
                userId: (req as any).user.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            },
            note,
        );
        return res.status(200).json({
            success: true,
            message: `Attendance processed as Grace for ${dates.length} day(s)`,
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAbsentDates = async (req: Request, res: Response) => {
    try {
        const { staffId, month } = (req as any).validatedQuery;

        const data = await payrollService.getAbsentDates(staffId, month);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const undoPayment = async (req: Request, res: Response) => {
    try {
        const { staffId, month, paymentType } = req.body;

        const result = await payrollService.undoPayroll(
            staffId,
            month,
            paymentType,
            {
                userId: (req as any).user.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            }
        );
        return res.status(200).json({
            success: true,
            message: "Payment undone successfully",
            data: result,
        });
    } catch (error: any) {
        const status = error.message.includes("locked") ? 400 : 500;
        return res
            .status(status)
            .json({ success: false, message: error.message });
    }
};

// ── Payroll Lock Handlers ──────────────────────────────────────────────

const getLockStatus = async (req: Request, res: Response) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({
                success: false,
                message: "Month query parameter is required",
            });
        }

        const lock = await payrollService.getLockStatus(month as string);
        return res.status(200).json({
            success: true,
            data: { isLocked: !!lock, lock },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const lockMonth = async (req: Request, res: Response) => {
    try {
        const { month } = req.body;
        const userId = (req as any).user.id || (req as any).user._id;
        const ipAddress = req.ip;
        const userAgent = (req.headers['user-agent'] as string) || '';
        
        const lock = await payrollService.lockMonth(month, userId, ipAddress, userAgent);
        return res.status(200).json({
            success: true,
            message: `Payroll for ${month} has been locked`,
            data: lock,
        });
    } catch (error: any) {
        const status = error.message.includes("already locked") ? 400 : 500;
        return res
            .status(status)
            .json({ success: false, message: error.message });
    }
};

const unlockMonth = async (req: Request, res: Response) => {
    try {
        const { month } = req.body;

        const userId = (req as any).user.id;
        
        await payrollService.unlockMonth(month, {
            userId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        
        return res.status(200).json({
            success: true,
            message: `Payroll for ${month} has been unlocked`,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const setAttendance = async (req: Request, res: Response) => {
    try {
        const { staffId, date, status } = req.body;

        if (!staffId || !date || !status) {
            return res.status(400).json({
                success: false,
                message: "staffId, date, and status are required",
            });
        }

        const result = await payrollService.setAttendance({
            staffId,
            date,
            status,
            context: {
                userId: (req as any).user.id || (req as any).user._id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            }
        });

        return res.status(200).json({
            success: true,
            message: "Attendance updated successfully",
            data: result,
        });
    } catch (error: any) {
        const statusCode = error.message.includes("not assigned") ? 400 : 500;
        return res
            .status(statusCode)
            .json({ success: false, message: error.message });
    }
};

export default {
    getPayrollPreview,
    processPayment,
    bulkProcessPayment,
    graceAttendance,
    getAbsentDates,
    undoPayment,
    getLockStatus,
    lockMonth,
    unlockMonth,
    setAttendance,
};
