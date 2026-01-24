import type { Request, Response } from 'express';
import ShiftServices from '../services/shift.service.js';

async function getMyShift(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const shift = await ShiftServices.getMyShiftFromDB(userId);

        return res.status(200).json({
            success: true,
            shift,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message,
        });
    }
}

const createShift = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const result = await ShiftServices.createShift(body, userId, userRole);

        return res.status(201).json({
            success: true,
            message: 'Shift created successfully',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getAllShifts = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const shifts = await ShiftServices.getAllShifts(userId, userRole);

        return res.status(200).json({
            success: true,
            shifts,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const updateShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!id || !userId || !userRole) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const shift = await ShiftServices.updateShift(
            id,
            req.body,
            userId,
            userRole,
        );

        return res.status(200).json({
            success: true,
            shift,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const deleteShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!id || !userId || !userRole) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        await ShiftServices.deleteShift(id, userId, userRole);

        return res.status(200).json({
            success: true,
            message: 'Shift deleted successfully',
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const ShiftControllers = {
    getMyShift,
    createShift,
    getAllShifts,
    updateShift,
    deleteShift,
};

export default ShiftControllers;
