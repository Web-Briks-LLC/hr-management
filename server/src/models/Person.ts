import { model, Schema, Types } from 'mongoose';

export interface IPerson {
    name: string;
    phone?: string;
    address?: string;
    description?: string;
    createdBy: Types.ObjectId | string;
}

const PersonSchema = new Schema<IPerson>(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
        description: { type: String, trim: true },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

const PersonModel = model<IPerson>('Person', PersonSchema);
export default PersonModel;
