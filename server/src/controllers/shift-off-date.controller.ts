import type { Request, Response, NextFunction } from 'express';
import ShiftOffDateService from '../services/shift-off-date.service.js';

const addOffDates = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { shiftId } = req.params;

        if (!shiftId) {
            res.status(400).json({
                success: false,
                message: 'Shift ID is required',
            });
            return;
        }
        const { dates, reason } = req.body;
        const userId = req.user?.id as string;

        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Dates array is required',
            });
            return;
        }

        const result = await ShiftOffDateService.addOffDates(
            shiftId,
            dates,
            reason,
            userId,
        );

        res.status(200).json({
            success: true,
            message: 'Off dates added successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const removeOffDates = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { shiftId } = req.params;

        if (!shiftId) {
            res.status(400).json({
                success: false,
                message: 'Shift ID is required',
            });
            return;
        }
        const { dates } = req.body;

        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Dates array is required',
            });
            return;
        }

        const result = await ShiftOffDateService.removeOffDates(shiftId, dates);

        res.status(200).json({
            success: true,
            message: 'Off dates removed successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const getOffDates = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { shiftId } = req.params;

        if (!shiftId) {
            res.status(400).json({
                success: false,
                message: 'Shift ID is required',
            });
            return;
        }

        const result = await ShiftOffDateService.getOffDates(shiftId);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const getMyShiftOffDates = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = req.user?.id as string;

        const result = await ShiftOffDateService.getMyShiftOffDates(userId);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export default {
    addOffDates,
    removeOffDates,
    getOffDates,
    getMyShiftOffDates,
};
