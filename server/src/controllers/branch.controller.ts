import type { Request, Response } from 'express';
import BranchServices from '../services/branch.service.js';

const createBranch = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        const result = await BranchServices.createBranch(body, userId);

        return res.status(201).json({
            success: true,
            message: 'Branch created successfully',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getAllBranches = async (_req: Request, res: Response) => {
    try {
        const branches = await BranchServices.getAllBranches();

        return res.status(200).json({
            success: true,
            branches,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const BranchControllers = {
    createBranch,
    getAllBranches,
};

export default BranchControllers;
