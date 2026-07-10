import { model, Schema } from 'mongoose';
import type { IReturnFileFormat } from '../types/return-file-format.type.js';

const returnFileFormatSchema = new Schema<IReturnFileFormat>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        extension: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

const ReturnFileFormatModel = model<IReturnFileFormat>(
    'ReturnFileFormat',
    returnFileFormatSchema
);
export default ReturnFileFormatModel;
