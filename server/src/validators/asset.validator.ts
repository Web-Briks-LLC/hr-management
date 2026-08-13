import { z } from 'zod';

const customFieldSchema = z.object({
    key: z.string().min(1, 'Key is required').max(100),
    value: z.string().min(1, 'Value is required').max(500),
});

const documentSchema = z.object({
    name: z.string().min(1, 'Document name is required').max(200),
    url: z.string().url('Invalid document URL'),
    fileType: z.string().optional(),
    uploadedAt: z.string().or(z.date()).optional(),
});

export const createAssetSchema = z.object({
    name: z
        .string({ message: 'Asset name is required' })
        .min(1, 'Asset name is required')
        .max(200, 'Asset name too long'),
    assetTag: z.string().max(50, 'Asset tag too long').optional(),
    category: z.enum([
        'electronics_it',
        'furniture_fixture',
        'office_supplies_pantry',
        'appliances_facilities',
        'documents_legal',
        'software_licenses',
        'vehicles_machinery',
        'other',
    ], { message: 'Valid category is required' }),
    subCategory: z.string().max(100).optional().nullable(),
    quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
    unit: z.string().min(1).max(50).default('pcs'),
    purchasePrice: z.number().min(0, 'Purchase price cannot be negative').default(0),
    totalCost: z.number().min(0, 'Total cost cannot be negative').optional(),
    currency: z.string().max(10).default('BDT'),
    currentValue: z.number().min(0).optional().nullable(),
    purchaseDate: z.string().or(z.date()).optional().nullable(),
    status: z.enum([
        'in_use',
        'in_stock',
        'maintenance',
        'damaged',
        'disposed',
        'lost',
        'expired',
    ]).default('in_use'),
    condition: z.enum(['new', 'good', 'fair', 'poor', 'damaged']).default('new'),
    location: z.string().max(200).optional().nullable(),
    branchId: z.string().optional().nullable(),
    assignedTo: z.string().optional().nullable(),
    assignedDepartment: z.string().max(100).optional().nullable(),
    assignedDate: z.string().or(z.date()).optional().nullable(),
    vendor: z.string().max(200).optional().nullable(),
    invoiceNumber: z.string().max(100).optional().nullable(),
    serialNumber: z.string().max(100).optional().nullable(),
    modelNumber: z.string().max(100).optional().nullable(),
    warrantyExpiry: z.string().or(z.date()).optional().nullable(),
    expiryDate: z.string().or(z.date()).optional().nullable(),
    specifications: z.record(z.string(), z.string()).optional(),
    customFields: z.array(customFieldSchema).optional(),
    documents: z.array(documentSchema).optional(),
    notes: z.string().max(3000, 'Notes too long').optional().nullable(),
});

export const updateAssetSchema = createAssetSchema.partial();

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
