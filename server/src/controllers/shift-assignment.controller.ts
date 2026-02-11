import type { Request, Response } from 'express';
import shiftAssignmentService from '../services/shift-assignment.service.js';

const assignShift = async (req: Request, res: Response) => {
    try {
        const { staffIds, shiftId, startDate } = req.body;
        const assignedBy = req.user?.id;

        if (!assignedBy) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User information is missing',
            });
        }

        if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one staff ID is required',
            });
        }

        const result = await shiftAssignmentService.assignShift({
            staffIds,
            shiftId,
            startDate,
            assignedBy,
        });

        if (result.failureCount > 0) {
            return res.status(400).json({
                success: false,
                message: result.errors[0]?.error || 'Failed to assign shift',
                errors: result.errors,
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Shift assigned successfully',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const shiftAssignmentController = {
    assignShift,
};
export default shiftAssignmentController;
