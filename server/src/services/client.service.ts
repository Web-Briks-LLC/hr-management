import { Types } from 'mongoose';
import ClientModel from '../models/client.model.js';
import type { ClientQueryParams } from '../types/client.type.js';
import type {
    CreateClientInput,
    UpdateClientInput,
} from '../validators/client.validation.js';
import { escapeRegex } from '../lib/sanitize.js';

// Build match stage from query params
const buildMatchStage = (
    params: ClientQueryParams,
): Record<string, unknown> => {
    const conditions: Record<string, unknown>[] = [];

    if (params.search) {
        const escaped = escapeRegex(params.search);
        conditions.push({
            $or: [
                { name: { $regex: escaped, $options: 'i' } },
                { emails: { $regex: escaped, $options: 'i' } },
                { clientId: { $regex: escaped, $options: 'i' } },
            ],
        });
    }

    if (params.status) {
        conditions.push({ status: params.status });
    }

    // Ownership filter: restrict to clients created by or assigned to a specific user
    if (params.createdBy) {
        const userId = new Types.ObjectId(params.createdBy);
        conditions.push({
            $or: [
                { createdBy: userId },
                { assignedTelemarketer: userId },
            ],
        });
    }

    if (params.assignedTelemarketer) {
        conditions.push({
            assignedTelemarketer: new Types.ObjectId(params.assignedTelemarketer),
        });
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0] || {};
    return { $and: conditions };
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

// Get next auto-incremented WB-10001 series client ID
const getNextClientIdFromDB = async (): Promise<string> => {
    const clients = await ClientModel.find({}, { clientId: 1 }).lean();
    let maxNum = 10000;

    for (const client of clients) {
        if (!client.clientId) continue;
        const match = client.clientId.match(/^WB-(\d+)$/i) || client.clientId.match(/(\d+)/);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
                maxNum = num;
            }
        }
    }

    let nextNum = maxNum + 1;
    let candidate = `WB-${nextNum}`;

    while (await checkClientIdExists(candidate)) {
        nextNum++;
        candidate = `WB-${nextNum}`;
    }

    return candidate;
};

// Migrate all existing clients to WB-10001, WB-10002... format ordered by creation date
const migrateClientIdsInDB = async (): Promise<{ updatedCount: number; mappings: { id: string; name: string; oldClientId: string; newClientId: string }[] }> => {
    const clients = await ClientModel.find().sort({ createdAt: 1 });
    let currentNum = 10001;
    const mappings: { id: string; name: string; oldClientId: string; newClientId: string }[] = [];

    for (const client of clients) {
        const newClientId = `WB-${currentNum}`;
        const oldClientId = client.clientId || 'unassigned';

        await ClientModel.updateOne(
            { _id: client._id },
            { $set: { clientId: newClientId } }
        );

        mappings.push({
            id: client._id.toString(),
            name: client.name,
            oldClientId,
            newClientId,
        });

        currentNum++;
    }

    return { updatedCount: mappings.length, mappings };
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

    const pipeline: any[] = [{ $match: matchStage }];

    pipeline.push(
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
            $lookup: {
                from: 'user',
                localField: 'assignedTelemarketer',
                foreignField: '_id',
                as: 'assignedTelemarketer',
            },
        },
        {
            $unwind: {
                path: '$assignedTelemarketer',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                'createdBy.password': 0,
                'createdBy.passwordHistory': 0,
                'assignedTelemarketer.password': 0,
                'assignedTelemarketer.passwordHistory': 0,
            },
        },
    );

    const [clients, countResult] = await Promise.all([
        ClientModel.aggregate(pipeline),
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
            $lookup: {
                from: 'user',
                localField: 'assignedTelemarketer',
                foreignField: '_id',
                as: 'assignedTelemarketer',
            },
        },
        {
            $unwind: {
                path: '$assignedTelemarketer',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: 'user',
                localField: 'assignedServices.assignedBy',
                foreignField: '_id',
                as: 'assignedByData',
            },
        },
        {
            $lookup: {
                from: 'services',
                localField: 'assignedServices.service',
                foreignField: '_id',
                as: 'servicesData',
            },
        },
        {
            $addFields: {
                assignedServicesDetails: {
                    $map: {
                        input: '$assignedServices',
                        as: 'assigned',
                        in: {
                            $mergeObjects: [
                                {
                                    $cond: {
                                        if: { $eq: [{ $type: '$$assigned' }, 'object'] },
                                        then: '$$assigned',
                                        else: { service: '$$assigned' }
                                    }
                                },
                                {
                                    serviceDetails: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$servicesData',
                                                    as: 'sd',
                                                    cond: { $eq: ['$$sd._id', '$$assigned.service'] }
                                                }
                                            },
                                            0
                                        ]
                                    },
                                    assignedByDetails: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$assignedByData',
                                                    as: 'ad',
                                                    cond: { $eq: ['$$ad._id', '$$assigned.assignedBy'] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                servicesData: 0,
                assignedByData: 0,
                'assignedServicesDetails.assignedByDetails.password': 0,
                'assignedServicesDetails.assignedByDetails.passwordHistory': 0
            }
        },
        {
            $project: {
                'createdBy.password': 0,
                'createdBy.passwordHistory': 0,
                'assignedTelemarketer.password': 0,
                'assignedTelemarketer.passwordHistory': 0,
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
    payload: CreateClientInput & { createdBy: string; assignedTelemarketer?: string | null | undefined },
) => {
    // If no client ID provided, generate auto WB-XXXXX client ID
    let finalClientId = payload.clientId;
    if (!finalClientId || !finalClientId.trim()) {
        finalClientId = await getNextClientIdFromDB();
    } else {
        const clientIdExists = await checkClientIdExists(finalClientId);
        if (clientIdExists) {
            const suggestions = await generateSuggestedIds(finalClientId);
            throw new ClientIdExistsError(
                `Client ID "${finalClientId}" already exists`,
                suggestions,
            );
        }
    }

    // Check if any of the emails already exist
    const emailsToMatch = payload.emails.map((e) => e.toLowerCase());
    const existingClient = await ClientModel.findOne({
        emails: { $in: emailsToMatch },
    });
    if (existingClient) {
        throw new Error(
            'One or more of these emails are already associated with another client',
        );
    }

    // Prepare data for creation
    const clientData = {
        clientId: finalClientId,
        name: payload.name,
        emails: payload.emails.map((e) => e.toLowerCase()),
        status: payload.status,
        createdBy: new Types.ObjectId(payload.createdBy),
        ...(payload.phone && { phone: payload.phone }),
        ...(payload.address && { address: payload.address }),
        ...(payload.officeAddress && { officeAddress: payload.officeAddress }),
        ...(payload.description && { description: payload.description }),
        ...(payload.teamMembers && { teamMembers: payload.teamMembers }),
        ...(payload.assignedServices && {
            assignedServices: payload.assignedServices.map(
                (assignment) => ({
                    service: new Types.ObjectId(assignment.service),
                    price: assignment.price,
                    assignedBy: new Types.ObjectId(payload.createdBy),
                    assignedDate: new Date(),
                })
            ),
        }),
        ...(payload.assignedTelemarketer !== undefined && {
            assignedTelemarketer: payload.assignedTelemarketer
                ? new Types.ObjectId(payload.assignedTelemarketer)
                : null,
        }),
    };

    const result = await ClientModel.create(clientData as any);
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

    // If updating emails, check if they are unique
    if (payload.emails) {
        const emailsToMatch = payload.emails.map((e) => e.toLowerCase());
        const existingClient = await ClientModel.findOne({
            emails: { $in: emailsToMatch },
            _id: { $ne: new Types.ObjectId(id) },
        });
        if (existingClient) {
            throw new Error(
                'One or more of these emails are already associated with another client',
            );
        }
    }
    // Convert assignedServices string IDs to ObjectIds if provided
    const updateData: Record<string, unknown> = { ...payload };
    if (payload.assignedServices) {
        updateData.assignedServices = payload.assignedServices.map(
            (assignment) => ({
                service: new Types.ObjectId(assignment.service),
                price: assignment.price,
                // Existing assignments won't be modified by default unless we pass them.
                // We'll let the controller handle setting assignedBy if it's a new assignment.
            })
        );
    }

    if (payload.assignedTelemarketer !== undefined) {
        updateData.assignedTelemarketer = payload.assignedTelemarketer
            ? new Types.ObjectId(payload.assignedTelemarketer)
            : null;
    }

    const result = await ClientModel.findByIdAndUpdate(id, updateData, {
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
        orderMatch.orderName = {
            $regex: escapeRegex(filters.search),
            $options: 'i',
        };
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

// Get all clients without pagination
const getAllClientsWithoutPaginationFromDB = async (params: { createdBy?: string; status?: string }) => {
    const query: Record<string, any> = {};
    if (params.createdBy) {
        const userId = new Types.ObjectId(params.createdBy);
        query.$or = [
            { createdBy: userId },
            { assignedTelemarketer: userId },
        ];
    }
    if (params.status) {
        query.status = params.status;
    }

    return ClientModel.find(query)
        .populate('assignedServices')
        .sort({ name: 1 })
        .lean();
};

export default {
    getAllClientsFromDB,
    getClientByIdFromDB,
    createClientInDB,
    updateClientInDB,
    deleteClientFromDB,
    checkClientIdAvailability,
    getClientStatsFromDB,
    getAllClientsWithoutPaginationFromDB,
    getNextClientIdFromDB,
    migrateClientIdsInDB,
};

export { ClientIdExistsError };
