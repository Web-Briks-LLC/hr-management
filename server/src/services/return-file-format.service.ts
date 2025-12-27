import ReturnFileFormatModel from '../models/return-file-format.model.js';
import type { IReturnFileFormat } from '../types/return-file-format.type.js';

async function createReturnFileFormatInDB(data: {
    name: string;
    extension: string;
    description?: string;
    createdBy: string;
}): Promise<IReturnFileFormat> {
    const format = await ReturnFileFormatModel.create(data);
    return format;
}

async function getAllReturnFileFormatsFromDB(options: {
    isActive?: boolean | undefined;
    page?: number;
    limit?: number;
}): Promise<{ formats: IReturnFileFormat[]; total: number }> {
    const { isActive, page = 1, limit = 50 } = options;

    const query: Record<string, unknown> = {};
    if (isActive !== undefined) {
        query.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [formats, total] = await Promise.all([
        ReturnFileFormatModel.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ReturnFileFormatModel.countDocuments(query),
    ]);

    return { formats: formats as IReturnFileFormat[], total };
}

async function getReturnFileFormatByIdFromDB(
    id: string
): Promise<IReturnFileFormat | null> {
    return ReturnFileFormatModel.findById(id).lean();
}

async function updateReturnFileFormatInDB(
    id: string,
    data: {
        name?: string;
        extension?: string;
        description?: string;
        isActive?: boolean;
    }
): Promise<IReturnFileFormat | null> {
    return ReturnFileFormatModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    }).lean();
}

async function deleteReturnFileFormatFromDB(
    id: string
): Promise<IReturnFileFormat | null> {
    return ReturnFileFormatModel.findByIdAndDelete(id).lean();
}

async function checkFormatNameExists(
    name: string,
    excludeId?: string
): Promise<boolean> {
    const query: Record<string, unknown> = {
        name: { $regex: new RegExp(`^${name}$`, 'i') },
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await ReturnFileFormatModel.findOne(query).lean();
    return !!existing;
}

export default {
    createReturnFileFormatInDB,
    getAllReturnFileFormatsFromDB,
    getReturnFileFormatByIdFromDB,
    updateReturnFileFormatInDB,
    deleteReturnFileFormatFromDB,
    checkFormatNameExists,
};
