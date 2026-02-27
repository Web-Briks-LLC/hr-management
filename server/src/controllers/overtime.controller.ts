import type { Request, Response } from "express";
import OvertimeServices from "../services/overtime.service.js";

const createOvertime = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result = await OvertimeServices.createOvertimeInDB({
            ...req.body,
            createdBy: userId,
        });

        res.status(201).json({
            success: true,
            message: "Overtime created successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create overtime",
        });
    }
};

const getAllOvertime = async (req: Request, res: Response) => {
    try {
        const queryParams = { ...(req.query as Record<string, unknown>) };
        const userRole = req.user?.role;
        const userId = req.user?.id as string;
        if (!userId) throw new Error("Unauthorized");

        if (userRole === "staff" || userRole === "team_leader") {
            const StaffModel = (await import("../models/staff.model.js"))
                .default;
            const staff = await StaffModel.findOne({ userId });
            if (!staff) throw new Error("Staff record not found");
            queryParams.staffId = String(staff._id);
        }

        const result = await OvertimeServices.getAllOvertimeFromDB(queryParams);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error("getAllOvertime Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch overtime records",
        });
    }
};

const getMyOvertime = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result = await OvertimeServices.getStaffOvertimeFromDB(userId);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch your overtime records",
        });
    }
};

const getOvertimeById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        const result = await OvertimeServices.getOvertimeByIdFromDB(id);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch overtime record",
        });
    }
};

const updateOvertime = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        const result = await OvertimeServices.updateOvertimeInDB(id, req.body);
        res.status(200).json({
            success: true,
            message: "Overtime updated successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update overtime",
        });
    }
};

const deleteOvertime = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error("ID is required");

        await OvertimeServices.deleteOvertimeFromDB(id);
        res.status(200).json({
            success: true,
            message: "Overtime deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete overtime",
        });
    }
};

const startStaffOvertime = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result = await OvertimeServices.startOvertimeInDB(userId);
        res.status(201).json({
            success: true,
            message: "Overtime started successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to start overtime",
        });
    }
};

const stopStaffOvertime = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result = await OvertimeServices.stopOvertimeInDB(userId);
        res.status(200).json({
            success: true,
            message: "Overtime stopped successfully",
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to stop overtime",
        });
    }
};

const getScheduledOvertimeToday = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error("Unauthorized");

        const result =
            await OvertimeServices.getScheduledOvertimeForToday(userId);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch scheduled overtime",
        });
    }
};

export default {
    createOvertime,
    getAllOvertime,
    getMyOvertime,
    getOvertimeById,
    updateOvertime,
    deleteOvertime,
    startStaffOvertime,
    stopStaffOvertime,
    getScheduledOvertimeToday,
};
