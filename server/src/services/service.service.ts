import ServiceModel from "../models/service.model.js";
import OrderModel from "../models/order.model.js";
import type { IService } from "../types/service.type.js";
import { escapeRegex } from "../lib/sanitize.js";

async function createServiceInDB(data: {
    name: string;
    description?: string;
    createdBy: string;
}): Promise<IService> {
    const service = await ServiceModel.create(data);
    return service;
}

async function getAllServicesFromDB(options: {
    isActive?: boolean | undefined;
    page?: number;
    limit?: number;
    search?: string;
}): Promise<{ services: (IService & { usageCount: number })[]; total: number }> {
    const { isActive, page = 1, limit = 50, search } = options;

    const query: Record<string, unknown> = {};
    if (isActive !== undefined) {
        query.isActive = isActive;
    }
    if (search) {
        query.name = { $regex: new RegExp(escapeRegex(search), "i") };
    }

    const skip = (page - 1) * limit;

    const pipeline: any[] = [
        { $match: query },
        {
            $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "services",
                as: "orderUsages",
            },
        },
        {
            $addFields: {
                usageCount: { $size: "$orderUsages" },
            },
        },
        { $project: { orderUsages: 0 } },
        { $sort: { name: 1 } },
        { $skip: skip },
        { $limit: limit },
    ];

    const [services, total] = await Promise.all([
        ServiceModel.aggregate(pipeline),
        ServiceModel.countDocuments(query),
    ]);

    return { services: services as (IService & { usageCount: number })[], total };
}

async function getServiceByIdFromDB(id: string): Promise<IService | null> {
    return ServiceModel.findById(id).lean();
}

async function updateServiceInDB(
    id: string,
    data: {
        name?: string;
        description?: string;
        isActive?: boolean;
    },
): Promise<IService | null> {
    return ServiceModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    }).lean();
}

async function deleteServiceFromDB(id: string): Promise<IService | null> {
    return ServiceModel.findByIdAndDelete(id).lean();
}

async function checkServiceHasUsage(id: string): Promise<boolean> {
    const usage = await OrderModel.findOne({ services: id }).lean();
    return !!usage;
}

async function migrateServiceUsage(
    oldId: string,
    newId: string,
): Promise<number> {
    // For every order that has oldId in its services array, replace it with newId
    // If the order already has newId, we should just pull oldId.
    
    // First, handles orders that have both (removes oldId)
    await OrderModel.updateMany(
        { services: { $all: [oldId, newId] } },
        { $pull: { services: oldId } }
    );

    // Then, handles orders that have oldId but not newId (replaces oldId with newId)
    const result = await OrderModel.updateMany(
       { services: oldId },
       { $set: { "services.$": newId } }
    );
    
    return result.modifiedCount;
}

async function checkServiceNameExists(
    name: string,
    excludeId?: string,
): Promise<boolean> {
    const query: Record<string, unknown> = {
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await ServiceModel.findOne(query).lean();
    return !!existing;
}

export default {
    createServiceInDB,
    getAllServicesFromDB,
    getServiceByIdFromDB,
    updateServiceInDB,
    deleteServiceFromDB,
    checkServiceNameExists,
    checkServiceHasUsage,
    migrateServiceUsage,
};
