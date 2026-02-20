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
        const { staffId, date, note } = req.body;

        const result = await payrollService.graceAttendance(
            staffId,
            date,
            note,
        );
        return res.status(200).json({
            success: true,
            message: "Attendance processed as Grace",
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

        const lock = await payrollService.lockMonth(month, userId);
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

        await payrollService.unlockMonth(month);
        return res.status(200).json({
            success: true,
            message: `Payroll for ${month} has been unlocked`,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
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
};
