import { Schema, model } from 'mongoose';
import type { IAsset } from '../types/asset.type.js';
import './branch.model.js';
import './staff.model.js';

const customFieldSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false },
);

const documentSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
        fileType: {
            type: String,
            trim: true,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false },
);

const assetSchema = new Schema<IAsset>(
    {
        name: {
            type: String,
            required: [true, 'Asset name is required'],
            trim: true,
            index: true,
        },
        assetTag: {
            type: String,
            unique: true,
            trim: true,
            index: true,
        },
        category: {
            type: String,
            required: [true, 'Asset category is required'],
            enum: [
                'electronics_it',
                'furniture_fixture',
                'office_supplies_pantry',
                'appliances_facilities',
                'documents_legal',
                'software_licenses',
                'vehicles_machinery',
                'other',
            ],
            index: true,
        },
        subCategory: {
            type: String,
            trim: true,
            index: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: [1, 'Quantity must be at least 1'],
        },
        unit: {
            type: String,
            required: true,
            default: 'pcs',
            trim: true,
        },
        purchasePrice: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Purchase price cannot be negative'],
        },
        totalCost: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Total cost cannot be negative'],
        },
        currency: {
            type: String,
            required: true,
            default: 'BDT',
            uppercase: true,
            trim: true,
        },
        currentValue: {
            type: Number,
            min: [0, 'Current value cannot be negative'],
        },
        purchaseDate: {
            type: Date,
            index: true,
        },
        status: {
            type: String,
            enum: [
                'in_use',
                'in_stock',
                'maintenance',
                'damaged',
                'disposed',
                'lost',
                'expired',
            ],
            default: 'in_use',
            index: true,
        },
        condition: {
            type: String,
            enum: ['new', 'good', 'fair', 'poor', 'damaged'],
            default: 'new',
            index: true,
        },
        location: {
            type: String,
            trim: true,
            index: true,
        },
        branchId: {
            type: Schema.Types.ObjectId,
            ref: 'Branch',
            index: true,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Staff',
            index: true,
        },
        assignedDepartment: {
            type: String,
            trim: true,
        },
        assignedDate: {
            type: Date,
        },
        vendor: {
            type: String,
            trim: true,
        },
        invoiceNumber: {
            type: String,
            trim: true,
        },
        serialNumber: {
            type: String,
            trim: true,
            index: true,
        },
        modelNumber: {
            type: String,
            trim: true,
        },
        warrantyExpiry: {
            type: Date,
        },
        expiryDate: {
            type: Date,
        },
        specifications: {
            type: Map,
            of: String,
            default: {},
        },
        customFields: [customFieldSchema],
        documents: [documentSchema],
        notes: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

// Compound indexes for searching & filtering
assetSchema.index({ category: 1, status: 1 });
assetSchema.index({ branchId: 1, status: 1 });
assetSchema.index({ assignedTo: 1, status: 1 });
assetSchema.index({ name: 'text', assetTag: 'text', serialNumber: 'text', vendor: 'text', notes: 'text' });

// Pre-save hook to calculate total cost if not manually provided
assetSchema.pre('save', function () {
    if (this.isModified('purchasePrice') || this.isModified('quantity') || !this.totalCost) {
        this.totalCost = (this.purchasePrice || 0) * (this.quantity || 1);
    }
});

const AssetModel = model<IAsset>('Asset', assetSchema);
export default AssetModel;
