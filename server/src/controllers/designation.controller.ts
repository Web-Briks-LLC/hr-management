import type { Request, Response } from "express";
import DesignationServices from "../services/designation.service.js";

const createDesignation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await DesignationServices.createDesignation(req.body, userId);
        return res.status(201).json({
            success: true,
            message: "Designation created successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getAllDesignations = async (_req: Request, res: Response) => {
    try {
        const designations = await DesignationServices.getAllDesignations();
        return res.status(200).json({
            success: true,
            designations,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const updateDesignation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Designation ID required" });
        }

        const designation = await DesignationServices.updateDesignation(id, req.body);
        return res.status(200).json({
            success: true,
            message: "Designation updated successfully",
            designation,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const deleteDesignation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Designation ID required" });
        }

        await DesignationServices.deleteDesignation(id);
        return res.status(200).json({
            success: true,
            message: "Designation deleted successfully",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const DesignationControllers = {
    createDesignation,
    getAllDesignations,
    updateDesignation,
    deleteDesignation,
};

export default DesignationControllers;
