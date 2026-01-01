import type { Request, Response } from 'express';
import ClientServices, {
    ClientIdExistsError,
} from '../services/client.service.js';
import type { ClientQueryParams } from '../types/client.type.js';
import {
    createClientSchema,
    updateClientSchema,
} from '../validators/client.validation.js';

const getAllClients = async (req: Request, res: Response) => {
    try {
        const params: ClientQueryParams = {
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
            search: req.query.search as string,
            sortBy: req.query.sortBy as string,
            sortOrder: req.query.sortOrder as 'asc' | 'desc',
            status: req.query.status as string,
        };

        const result = await ClientServices.getAllClientsFromDB(params);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to fetch clients',
        });
    }
};

const getClientById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error('ID is required');

        const result = await ClientServices.getClientByIdFromDB(id);
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Client not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to fetch client',
        });
    }
};

const createClient = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) throw new Error('Unauthorized');

        // Validate request body with Zod
        const validationResult = createClientSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
            return;
        }

        const result = await ClientServices.createClientInDB({
            ...validationResult.data,
            createdBy: userId,
        });

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            data: result,
        });
    } catch (error: unknown) {
        // Handle ClientIdExistsError specifically - return as field error with suggestions
        if (error instanceof ClientIdExistsError) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: {
                    clientId: [
                        `${error.message}. Try: ${error.suggestions.join(
                            ', '
                        )}`,
                    ],
                },
                suggestions: error.suggestions,
            });
            return;
        }

        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to create client',
        });
    }
};

const updateClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error('ID is required');

        // Validate request body with Zod
        const validationResult = updateClientSchema.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationResult.error.flatten().fieldErrors,
            });
            return;
        }

        const result = await ClientServices.updateClientInDB(
            id,
            validationResult.data
        );
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Client not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Client updated successfully',
            data: result,
        });
    } catch (error: unknown) {
        // Handle ClientIdExistsError specifically - return as field error with suggestions
        if (error instanceof ClientIdExistsError) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: {
                    clientId: [
                        `${error.message}. Try: ${error.suggestions.join(
                            ', '
                        )}`,
                    ],
                },
                suggestions: error.suggestions,
            });
            return;
        }

        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to update client',
        });
    }
};

const deleteClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error('ID is required');

        const result = await ClientServices.deleteClientFromDB(id);
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Client not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Client deleted successfully',
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to delete client',
        });
    }
};

const checkClientId = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.params;
        if (!clientId) {
            res.status(400).json({
                success: false,
                message: 'Client ID is required',
            });
            return;
        }

        const result = await ClientServices.checkClientIdAvailability(clientId);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to check client ID',
        });
    }
};

const getClientStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) throw new Error('Client ID is required');

        const result = await ClientServices.getClientStatsFromDB(id);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to fetch client stats',
        });
    }
};

export default {
    getAllClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    checkClientId,
    getClientStats,
};
