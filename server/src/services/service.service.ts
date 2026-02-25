import ServiceModel from "../models/service.model.js";
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
}): Promise<{ services: IService[]; total: number }> {
    const { isActive, page = 1, limit = 50 } = options;

    const query: Record<string, unknown> = {};
    if (isActive !== undefined) {
        query.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
        ServiceModel.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ServiceModel.countDocuments(query),
    ]);

    return { services: services as IService[], total };
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
};
