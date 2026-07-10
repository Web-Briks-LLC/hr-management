import type { Request, Response } from 'express';
import returnFileFormatService from '../services/return-file-format.service.js';

async function createReturnFileFormat(req: Request, res: Response) {
    try {
        const { name, extension, description } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check for duplicate name
        const exists = await returnFileFormatService.checkFormatNameExists(
            name
        );
        if (exists) {
            return res.status(400).json({
                message: 'Return file format with this name already exists',
            });
        }

        const format = await returnFileFormatService.createReturnFileFormatInDB(
            {
                name,
                extension,
                description,
                createdBy: userId,
            }
        );

        return res.status(201).json({
            message: 'Return file format created successfully',
            data: format,
        });
    } catch (error) {
        console.error('Error creating return file format:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllReturnFileFormats(req: Request, res: Response) {
    try {
        const { isActive, page, limit } = req.query;

        const result =
            await returnFileFormatService.getAllReturnFileFormatsFromDB({
                isActive:
                    isActive === 'true'
                        ? true
                        : isActive === 'false'
                        ? false
                        : undefined,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 50,
            });

        return res.status(200).json({
            message: 'Return file formats retrieved successfully',
            data: result.formats,
            meta: {
                total: result.total,
            },
        });
    } catch (error) {
        console.error('Error getting return file formats:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getReturnFileFormatById(req: Request, res: Response) {
    try {
        const id = req.params.id;

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Return file format ID is required' });
        }

        const format =
            await returnFileFormatService.getReturnFileFormatByIdFromDB(id);

        if (!format) {
            return res
                .status(404)
                .json({ message: 'Return file format not found' });
        }

        return res.status(200).json({
            message: 'Return file format retrieved successfully',
            data: format,
        });
    } catch (error) {
        console.error('Error getting return file format:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateReturnFileFormat(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const { name, extension, description, isActive } = req.body;

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Return file format ID is required' });
        }

        // Check for duplicate name if name is being updated
        if (name) {
            const exists = await returnFileFormatService.checkFormatNameExists(
                name,
                id
            );
            if (exists) {
                return res.status(400).json({
                    message: 'Return file format with this name already exists',
                });
            }
        }

        const format = await returnFileFormatService.updateReturnFileFormatInDB(
            id,
            {
                name,
                extension,
                description,
                isActive,
            }
        );

        if (!format) {
            return res
                .status(404)
                .json({ message: 'Return file format not found' });
        }

        return res.status(200).json({
            message: 'Return file format updated successfully',
            data: format,
        });
    } catch (error) {
        console.error('Error updating return file format:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteReturnFileFormat(req: Request, res: Response) {
    try {
        const id = req.params.id;

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Return file format ID is required' });
        }

        const format =
            await returnFileFormatService.deleteReturnFileFormatFromDB(id);

        if (!format) {
            return res
                .status(404)
                .json({ message: 'Return file format not found' });
        }

        return res.status(200).json({
            message: 'Return file format deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting return file format:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    createReturnFileFormat,
    getAllReturnFileFormats,
    getReturnFileFormatById,
    updateReturnFileFormat,
    deleteReturnFileFormat,
};
