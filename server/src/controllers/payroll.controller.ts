import type { Request, Response } from "express";
import payrollService from "../services/payroll.service.js";

const getPayrollPreview = async (req: Request, res: Response) => {
    try {
        const { month, branchId } = req.query;

        if (!month) {
            return res
                .status(400)
                .json({ success: false, message: "Month is required" });
        }

        const data = await payrollService.getPayrollPreview({
            month: month as string,
            branchId: branchId as string,
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

        if (!staffId || !month || !amount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        const result = await payrollService.processPayroll({
            staffId,
            month,
            amount,
            paymentMethod,
            note,
            bonus,
            deduction,
            createdBy: (req as any).user.userId,
            paymentType,
        });

        return res.status(200).json({
            success: true,
            message: "Payment processed successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const bulkProcessPayment = async (req: Request, res: Response) => {
    try {
        const { month, payments, paymentMethod } = req.body;
        const userId = (req as any).user.id || (req as any).user._id;

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Payments array is required",
            });
        }

        const result = await payrollService.bulkProcessPayment({
            month,
            payments,
            paymentMethod,
            createdBy: userId,
        });

        return res.status(200).json({
            success: true,
            message: "Bulk processing completed",
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
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
        const { staffId, month } = req.query;

        if (!staffId || !month) {
            return res.status(400).json({
                success: false,
                message: "Staff ID and Month are required",
            });
        }

        const data = await payrollService.getAbsentDates(
            staffId as string,
            month as string,
        );
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const undoPayment = async (req: Request, res: Response) => {
    try {
        const { staffId, month, paymentType } = req.body;

        if (!staffId || !month) {
            return res.status(400).json({
                success: false,
                message: "Staff ID and Month are required",
            });
        }

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
};
