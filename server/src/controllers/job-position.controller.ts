import type { Request, Response } from 'express';
import jobPositionService from '../services/job-position.service.js';

// Create a new job position (admin)
async function createPosition(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {
            slug,
            title,
            company,
            location,
            vacancies,
            officeTime,
            jobType,
            salary,
            deadline,
            companyHistory,
            description,
            responsibilities,
            requirements,
            benefits,
            shift,
            gender,
            applyInstruction,
            isOpened,
        } = req.body;

        if (!title || !company || !location || !description || !deadline) {
            return res.status(400).json({
                message: 'Title, company, location, description, and deadline are required',
            });
        }

        // Generate slug if not provided
        const finalSlug = slug || (await jobPositionService.generateSlug(title));

        const position = await jobPositionService.createPosition({
            slug: finalSlug,
            title,
            company,
            location,
            vacancies: vacancies || 1,
            officeTime,
            jobType: jobType || 'Work at office',
            salary: salary || 'Negotiable',
            deadline: new Date(deadline),
            companyHistory,
            description,
            responsibilities,
            requirements,
            benefits,
            shift,
            gender,
            applyInstruction,
            isOpened: isOpened !== false,
            createdBy: userId,
        });

        return res.status(201).json({
            message: 'Job position created successfully',
            data: position,
        });
    } catch (error) {
        console.error('Error creating job position:', error);
        if ((error as { code?: number }).code === 11000) {
            return res.status(400).json({ message: 'A position with this slug already exists' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Update a job position (admin)
async function updatePosition(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Position ID is required' });
        }

        const {
            slug,
            title,
            company,
            location,
            vacancies,
            officeTime,
            jobType,
            salary,
            deadline,
            companyHistory,
            description,
            responsibilities,
            requirements,
            benefits,
            shift,
            gender,
            applyInstruction,
            isOpened,
        } = req.body;

        const position = await jobPositionService.updatePosition(id, {
            ...(slug && { slug }),
            ...(title && { title }),
            ...(company && { company }),
            ...(location && { location }),
            ...(vacancies !== undefined && { vacancies }),
            ...(officeTime && { officeTime }),
            ...(jobType && { jobType }),
            ...(salary && { salary }),
            ...(deadline && { deadline: new Date(deadline) }),
            ...(companyHistory !== undefined && { companyHistory }),
            ...(description && { description }),
            ...(responsibilities && { responsibilities }),
            ...(requirements && { requirements }),
            ...(benefits && { benefits }),
            ...(shift !== undefined && { shift }),
            ...(gender !== undefined && { gender }),
            ...(applyInstruction !== undefined && { applyInstruction }),
            ...(isOpened !== undefined && { isOpened }),
            updatedBy: userId,
        });

        if (!position) {
            return res.status(404).json({ message: 'Position not found' });
        }

        return res.status(200).json({
            message: 'Job position updated successfully',
            data: position,
        });
    } catch (error) {
        console.error('Error updating job position:', error);
        if ((error as { code?: number }).code === 11000) {
            return res.status(400).json({ message: 'A position with this slug already exists' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Toggle position open/closed (admin)
async function togglePosition(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Position ID is required' });
        }

        const position = await jobPositionService.togglePosition(id, userId);

        if (!position) {
            return res.status(404).json({ message: 'Position not found' });
        }

        return res.status(200).json({
            message: `Position ${position.isOpened ? 'opened' : 'closed'} successfully`,
            data: position,
        });
    } catch (error) {
        console.error('Error toggling job position:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Delete a job position (admin)
async function deletePosition(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Position ID is required' });
        }

        const result = await jobPositionService.deletePosition(id);

        if (!result) {
            return res.status(404).json({ message: 'Position not found' });
        }

        return res.status(200).json({
            message: 'Job position deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting job position:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get all positions (admin)
async function getAllPositions(req: Request, res: Response) {
    try {
        const { isOpened, page, limit } = req.query;

        const result = await jobPositionService.getAllPositions({
            ...(isOpened !== undefined && { isOpened: isOpened === 'true' }),
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });

        return res.status(200).json({
            message: 'Positions retrieved successfully',
            data: result.positions,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting job positions:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get open positions (public - no auth)
async function getOpenPositions(_req: Request, res: Response) {
    try {
        const positions = await jobPositionService.getOpenPositions();

        return res.status(200).json({
            message: 'Open positions retrieved successfully',
            data: positions,
        });
    } catch (error) {
        console.error('Error getting open positions:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get position by ID (admin)
async function getPositionById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Position ID is required' });
        }

        const position = await jobPositionService.getPositionById(id);

        if (!position) {
            return res.status(404).json({ message: 'Position not found' });
        }

        return res.status(200).json({
            message: 'Position retrieved successfully',
            data: position,
        });
    } catch (error) {
        console.error('Error getting job position:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get position by slug (public - no auth)
async function getPositionBySlug(req: Request, res: Response) {
    try {
        const { slug } = req.params;
        if (!slug) {
            return res.status(400).json({ message: 'Slug is required' });
        }

        const position = await jobPositionService.getPositionBySlug(slug);

        if (!position) {
            return res.status(404).json({ message: 'Position not found' });
        }

        return res.status(200).json({
            message: 'Position retrieved successfully',
            data: position,
        });
    } catch (error) {
        console.error('Error getting job position by slug:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default {
    createPosition,
    updatePosition,
    togglePosition,
    deletePosition,
    getAllPositions,
    getOpenPositions,
    getPositionById,
    getPositionBySlug,
};
