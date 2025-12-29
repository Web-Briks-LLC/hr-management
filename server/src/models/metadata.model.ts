import { model, Schema } from 'mongoose';

export interface IMetadata {
    type: 'department' | 'designation';
    value: string;
    label: string;
    isActive: boolean;
    createdBy?: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const metadataSchema = new Schema<IMetadata>(
    {
        type: {
            type: String,
            enum: ['department', 'designation'],
            required: true,
            index: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
        },
        label: {
            type: String,
            required: true,
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
        },
    },
    { timestamps: true }
);

// Unique compound index for type + value
metadataSchema.index({ type: 1, value: 1 }, { unique: true });

const MetadataModel = model<IMetadata>('Metadata', metadataSchema);
export default MetadataModel;
