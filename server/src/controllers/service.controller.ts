import type { Request, Response } from 'express';
import serviceService from '../services/service.service.js';

async function createService(req: Request, res: Response) {
    try {
        const { name, description } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check for duplicate name
        const exists = await serviceService.checkServiceNameExists(name);
        if (exists) {
            return res.status(400).json({
                message: 'Service with this name already exists',
            });
        }

        const service = await serviceService.createServiceInDB({
            name,
            description,
            createdBy: userId,
        });

        return res.status(201).json({
            message: 'Service created successfully',
            data: service,
        });
    } catch (error) {
        console.error('Error creating service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllServices(req: Request, res: Response) {
    try {
        const { isActive, page, limit, search } = req.query;

        const result = await serviceService.getAllServicesFromDB({
            isActive:
                isActive === 'true'
                    ? true
                    : isActive === 'false'
                    ? false
                    : undefined,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 50,
            search: search as string,
        });

        return res.status(200).json({
            message: 'Services retrieved successfully',
            data: result.services,
            meta: {
                total: result.total,
            },
        });
    } catch (error) {
        console.error('Error getting services:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getServiceById(req: Request, res: Response) {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const service = await serviceService.getServiceByIdFromDB(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        return res.status(200).json({
            message: 'Service retrieved successfully',
            data: service,
        });
    } catch (error) {
        console.error('Error getting service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateService(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const { name, description, isActive } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        // Check for duplicate name if name is being updated
        if (name) {
            const exists = await serviceService.checkServiceNameExists(
                name,
                id
            );
            if (exists) {
                return res.status(400).json({
                    message: 'Service with this name already exists',
                });
            }
        }

        const service = await serviceService.updateServiceInDB(id, {
            name,
            description,
            isActive,
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        return res.status(200).json({
            message: 'Service updated successfully',
            data: service,
        });
    } catch (error) {
        console.error('Error updating service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function checkServiceUsage(req: Request, res: Response) {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const hasUsage = await serviceService.checkServiceHasUsage(id);
        return res.status(200).json({
            message: 'Usage check completed',
            data: { hasUsage },
        });
    } catch (error) {
        console.error('Error checking service usage:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteService(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const { migrationId } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        // If migrationId is provided, migrate orders first
        if (migrationId) {
            if (id === migrationId) {
                return res.status(400).json({ message: 'Cannot migrate to the same service' });
            }
            await serviceService.migrateServiceUsage(id, migrationId);
        } else {
            // Check for usage if no migrationId provided
            const hasUsage = await serviceService.checkServiceHasUsage(id);
            if (hasUsage) {
                return res.status(400).json({ 
                    message: 'Service is in use and cannot be deleted without migration.',
                    requiresMigration: true
                });
            }
        }

        const service = await serviceService.deleteServiceFromDB(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        return res.status(200).json({
            message: migrationId ? 'Service migrated and deleted successfully' : 'Service deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    checkServiceUsage,
};
