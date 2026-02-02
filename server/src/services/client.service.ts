import { Types } from 'mongoose';
import ClientModel from '../models/client.model.js';
import type { ClientQueryParams } from '../types/client.type.js';
import type {
    CreateClientInput,
    UpdateClientInput,
} from '../validators/client.validation.js';

// Build match stage from query params
const buildMatchStage = (
    params: ClientQueryParams,
): Record<string, unknown> => {
    const match: Record<string, unknown> = {};

    if (params.search) {
        match.$or = [
            { name: { $regex: params.search, $options: 'i' } },
            { email: { $regex: params.search, $options: 'i' } },
            { clientId: { $regex: params.search, $options: 'i' } },
        ];
    }

    if (params.status) {
        match.status = params.status;
    }

    return match;
};

// Generate suggested client IDs based on the attempted ID
const generateSuggestedIds = async (baseId: string): Promise<string[]> => {
    const suggestions: string[] = [];

    // Try to detect if the ID has a numeric suffix pattern like "CLT-0001" or "ABC-123"
    const numericMatch = baseId.match(/^(.+?)(\d+)$/);

    if (numericMatch && numericMatch[1] && numericMatch[2]) {
        // ID has a numeric suffix, increment it
        const prefix = numericMatch[1];
        const numPart = numericMatch[2];
        const numLength = numPart.length;
        let currentNum = parseInt(numPart, 10);
        const baseNum = currentNum;

        // Generate suggestions by incrementing the number
        while (suggestions.length < 3) {
            currentNum++;
            const suggestedId = `${prefix}${String(currentNum).padStart(
                numLength,
                '0',
            )}`;
            const exists = await ClientModel.findOne({ clientId: suggestedId });
            if (!exists) {
                suggestions.push(suggestedId);
            }
            // Prevent infinite loop
            if (currentNum > baseNum + 100) break;
        }
    }

    // If still not enough suggestions, try appending numbers
    let counter = 1;
    while (suggestions.length < 3 && counter <= 20) {
        const suggestedId = `${baseId}${counter}`;
        const exists = await ClientModel.findOne({ clientId: suggestedId });
        if (!exists && !suggestions.includes(suggestedId)) {
            suggestions.push(suggestedId);
        }
        counter++;
    }

    return suggestions;
};

// Check if client ID exists
const checkClientIdExists = async (
    clientId: string,
    excludeId?: string,
): Promise<boolean> => {
    const query: Record<string, unknown> = { clientId };
    if (excludeId) {
        query._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await ClientModel.findOne(query);
    return !!existing;
};

// Check client ID availability and return suggestions if taken
const checkClientIdAvailability = async (
    clientId: string,
): Promise<{ available: boolean; suggestions?: string[] }> => {
    const exists = await checkClientIdExists(clientId);
    if (exists) {
        const suggestions = await generateSuggestedIds(clientId);
        return { available: false, suggestions };
    }
    return { available: true };
};

// Get all clients with pagination and filtering
const getAllClientsFromDB = async (params: ClientQueryParams) => {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sortStage: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const matchStage = buildMatchStage(params);

    const [clients, countResult] = await Promise.all([
        ClientModel.aggregate([
            { $match: matchStage },
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'user',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy',
                },
            },
            {
                $unwind: {
                    path: '$createdBy',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    'createdBy.password': 0,
                },
            },
        ]),
        ClientModel.countDocuments(matchStage),
    ]);

    return {
        clients,
        pagination: {
            page,
            limit,
            total: countResult,
            pages: Math.ceil(countResult / limit),
        },
    };
};

// Get client by ID
const getClientByIdFromDB = async (id: string) => {
    const result = await ClientModel.aggregate([
        { $match: { _id: new Types.ObjectId(id) } },
        {
            $lookup: {
                from: 'user',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
            },
        },
        {
            $unwind: {
                path: '$createdBy',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                'createdBy.password': 0,
                'createdBy.passwordHistory': 0,
            },
        },
    ]);
    return result[0] || null;
};

// Custom error class for client ID conflicts
class ClientIdExistsError extends Error {
    suggestions: string[];

    constructor(message: string, suggestions: string[]) {
        super(message);
        this.name = 'ClientIdExistsError';
        this.suggestions = suggestions;
    }
}

// Create client
const createClientInDB = async (
    payload: CreateClientInput & { createdBy: string },
) => {
    // Check if client ID already exists
    const clientIdExists = await checkClientIdExists(payload.clientId);
    if (clientIdExists) {
        const suggestions = await generateSuggestedIds(payload.clientId);
        throw new ClientIdExistsError(
            `Client ID "${payload.clientId}" already exists`,
            suggestions,
        );
    }

    // Check if email already exists
    const existingClient = await ClientModel.findOne({
        email: payload.email.toLowerCase(),
    });
    if (existingClient) {
        throw new Error('A client with this email already exists');
    }

    // Prepare data for creation
    const clientData = {
        clientId: payload.clientId,
        name: payload.name,
        email: payload.email,
        status: payload.status,
        createdBy: new Types.ObjectId(payload.createdBy),
        ...(payload.phone && { phone: payload.phone }),
        ...(payload.address && { address: payload.address }),
        ...(payload.officeAddress && { officeAddress: payload.officeAddress }),
        ...(payload.description && { description: payload.description }),
    };

    const result = await ClientModel.create(clientData);
    return result;
};

// Update client
const updateClientInDB = async (id: string, payload: UpdateClientInput) => {
    // If updating client ID, check if it's unique
    if (payload.clientId) {
        const clientIdExists = await checkClientIdExists(payload.clientId, id);
        if (clientIdExists) {
            const suggestions = await generateSuggestedIds(payload.clientId);
            throw new ClientIdExistsError(
                `Client ID "${payload.clientId}" already exists`,
                suggestions,
            );
        }
    }

    // If updating email, check if it's unique
    if (payload.email) {
        const existingClient = await ClientModel.findOne({
            email: payload.email.toLowerCase(),
            _id: { $ne: new Types.ObjectId(id) },
        });
        if (existingClient) {
            throw new Error('A client with this email already exists');
        }
    }

    const result = await ClientModel.findByIdAndUpdate(id, payload, {
        new: true,
    });
    return result;
};

// Delete client
const deleteClientFromDB = async (id: string) => {
    const result = await ClientModel.findByIdAndDelete(id);
    return result;
};

// Get client financial stats with optional filters
interface ClientStatsFilters {
    month?: number | undefined;
    year?: number | undefined;
    status?: string | undefined;
    priority?: string | undefined;
    search?: string | undefined;
}

const getClientStatsFromDB = async (
    clientId: string,
    filters?: ClientStatsFilters,
) => {
    const { default: OrderModel } = await import('../models/order.model.js');

    const clientObjectId = new Types.ObjectId(clientId);

    // Build order match query
    const orderMatch: Record<string, unknown> = { clientId: clientObjectId };

    // Add date filters
    if (filters?.month || filters?.year) {
        const dateConditions: Record<string, unknown>[] = [];
        if (filters.month) {
            dateConditions.push({
                $eq: [{ $month: '$orderDate' }, filters.month],
            });
        }
        if (filters.year) {
            dateConditions.push({
                $eq: [{ $year: '$orderDate' }, filters.year],
            });
        }
        orderMatch.$expr = { $and: dateConditions };
    }

    // Add status filter
    if (filters?.status) {
        orderMatch.status = filters.status;
    }

    // Add priority filter
    if (filters?.priority) {
        orderMatch.priority = filters.priority;
    }

    // Add search filter
    if (filters?.search) {
        orderMatch.orderName = { $regex: filters.search, $options: 'i' };
    }

    // Aggregation pipeline to calculate stats
    const stats = await OrderModel.aggregate([
        { $match: orderMatch },
        {
            $lookup: {
                from: 'earnings',
                localField: '_id',
                foreignField: 'orderIds',
                as: 'earning',
            },
        },
        {
            $unwind: {
                path: '$earning',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: '$totalPrice' },
                totalImages: { $sum: '$imageQuantity' },
                paidAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$earning.status', 'paid'] },
                            '$totalPrice',
                            0,
                        ],
                    },
                },
                totalBDT: {
                    $sum: {
                        $cond: [
                            { $eq: ['$earning.status', 'paid'] },
                            {
                                $multiply: [
                                    '$totalPrice',
                                    { $ifNull: ['$earning.conversionRate', 0] },
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const result = stats[0] || {
        totalOrders: 0,
        totalAmount: 0,
        totalImages: 0,
        paidAmount: 0,
        totalBDT: 0,
    };

    const dueAmount = result.totalAmount - result.paidAmount;

    return {
        totalOrders: result.totalOrders,
        totalAmount: result.totalAmount,
        totalImages: result.totalImages,
        paidAmount: result.paidAmount,
        totalBDT: result.totalBDT,
        dueAmount: Math.max(0, dueAmount),
    };
};

export default {
    getAllClientsFromDB,
    getClientByIdFromDB,
    createClientInDB,
    updateClientInDB,
    deleteClientFromDB,
    checkClientIdAvailability,
    getClientStatsFromDB,
};

export { ClientIdExistsError };
