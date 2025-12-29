import { Types } from 'mongoose';
import MetadataModel from '../models/metadata.model.js';
import type { IMetadataCreate } from '../types/metadata.type.js';

const createMetadata = async (data: IMetadataCreate) => {
    // Check for existing entry
    const existing = await MetadataModel.findOne({
        type: data.type,
        value: data.value,
    });

    if (existing) {
        throw new Error(
            `${data.type} with value "${data.value}" already exists`
        );
    }

    const metadata = await (MetadataModel.create as any)({
        type: data.type,
        value: data.value,
        label: data.label,
        createdBy: data.createdBy
            ? new Types.ObjectId(data.createdBy)
            : undefined,
    });

    return metadata;
};

const getMetadataByType = async (type: 'department' | 'designation') => {
    return await MetadataModel.find({ type, isActive: true }).sort({
        label: 1,
    });
};

const getAllMetadata = async () => {
    return await MetadataModel.find({ isActive: true }).sort({
        type: 1,
        label: 1,
    });
};

const updateMetadata = async (id: string, data: Partial<IMetadataCreate>) => {
    const metadata = await MetadataModel.findById(id);

    if (!metadata) {
        throw new Error('Metadata not found');
    }

    if (data.value && data.value !== metadata.value) {
        const existing = await MetadataModel.findOne({
            type: metadata.type,
            value: data.value,
            _id: { $ne: id },
        });

        if (existing) {
            throw new Error(
                `${metadata.type} with value "${data.value}" already exists`
            );
        }
    }

    Object.assign(metadata, data);
    await metadata.save();

    return metadata;
};

const deleteMetadata = async (id: string) => {
    const metadata = await MetadataModel.findById(id);

    if (!metadata) {
        throw new Error('Metadata not found');
    }

    // Soft delete - just deactivate
    metadata.isActive = false;
    await metadata.save();

    return { message: `${metadata.type} deleted successfully` };
};

const hardDeleteMetadata = async (id: string) => {
    const result = await MetadataModel.findByIdAndDelete(id);

    if (!result) {
        throw new Error('Metadata not found');
    }

    return { message: 'Metadata permanently deleted' };
};

export default {
    createMetadata,
    getMetadataByType,
    getAllMetadata,
    updateMetadata,
    deleteMetadata,
    hardDeleteMetadata,
};
