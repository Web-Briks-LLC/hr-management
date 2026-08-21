import type { Request, Response } from "express";
import DepartmentServices from "../services/department.service.js";

const createDepartment = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await DepartmentServices.createDepartment(req.body, userId);
        return res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getAllDepartments = async (_req: Request, res: Response) => {
    try {
        const departments = await DepartmentServices.getAllDepartments();
        return res.status(200).json({
            success: true,
            departments,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const updateDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Department ID required" });
        }

        const department = await DepartmentServices.updateDepartment(id, req.body);
        return res.status(200).json({
            success: true,
            message: "Department updated successfully",
            department,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Department ID required" });
        }

        await DepartmentServices.deleteDepartment(id);
        return res.status(200).json({
            success: true,
            message: "Department deleted successfully",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const DepartmentControllers = {
    createDepartment,
    getAllDepartments,
    updateDepartment,
    deleteDepartment,
};

export default DepartmentControllers;
