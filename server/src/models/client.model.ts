import { model, Schema } from 'mongoose';
import type { IClient } from '../types/client.type.js';

const ClientSchema = new Schema<IClient>(
    {
        clientId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        emails: {
            type: [String],
            required: true,
            validate: {
                validator: function (v: string[]) {
                    return v && v.length > 0;
                },
                message: 'At least one email is required',
            },
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        officeAddress: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        currency: {
            type: String,
            trim: true,
            uppercase: true, // Store as uppercase (USD, EUR, etc.)
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Virtual for backward compatibility
ClientSchema.virtual('email').get(function () {
    return this.emails && this.emails.length > 0 ? this.emails[0] : '';
});

// Compound index for search
ClientSchema.index({ name: 'text', emails: 'text' });

const ClientModel = model<IClient>('Client', ClientSchema);
export default ClientModel;
