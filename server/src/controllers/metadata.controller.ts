import type { Request, Response } from 'express';
import MetadataService from '../services/metadata.service.js';

const createMetadata = async (req: Request, res: Response) => {
    try {
        const createdBy = req.user?.id;

        if (!createdBy) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const metadata = await MetadataService.createMetadata({
            ...req.body,
            createdBy,
        });

        return res.status(201).json({
            success: true,
            message: `${metadata.type} created successfully`,
            data: metadata,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getMetadataByType = async (req: Request, res: Response) => {
    try {
        const { type } = req.params;

        if (type !== 'department' && type !== 'designation') {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid metadata type. Must be "department" or "designation"',
            });
        }

        const metadata = await MetadataService.getMetadataByType(type);

        return res.status(200).json({
            success: true,
            data: metadata,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getAllMetadata = async (_req: Request, res: Response) => {
    try {
        const metadata = await MetadataService.getAllMetadata();

        return res.status(200).json({
            success: true,
            data: metadata,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const updateMetadata = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Metadata ID is required',
            });
        }

        const metadata = await MetadataService.updateMetadata(id, req.body);

        return res.status(200).json({
            success: true,
            message: 'Metadata updated successfully',
            data: metadata,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const deleteMetadata = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Metadata ID is required',
            });
        }

        const result = await MetadataService.deleteMetadata(id);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

export default {
    createMetadata,
    getMetadataByType,
    getAllMetadata,
    updateMetadata,
    deleteMetadata,
};
