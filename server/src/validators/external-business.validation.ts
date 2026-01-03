import { z } from 'zod';

// ============ External Business Schemas ============
export const createExternalBusinessSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters'),
    description: z.string().max(500).optional(),
    contactPerson: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const updateExternalBusinessSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    contactPerson: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    isActive: z.boolean().optional(),
});

// ============ Profit Transfer Schemas ============
export const createProfitTransferSchema = z
    .object({
        businessId: z.string().min(1, 'Business is required'),
        amount: z.number().positive('Amount must be positive'),
        transferDate: z.coerce.date().optional(),
        periodType: z.enum(['month', 'year']),
        month: z.number().min(1).max(12).optional(),
        year: z.number().min(2000).max(2100),
        notes: z.string().max(500).optional(),
    })
    .refine(
        (data) => {
            if (data.periodType === 'month' && !data.month) {
                return false;
            }
            return true;
        },
        {
            message: 'Month is required when period type is month',
            path: ['month'],
        }
    );

export const profitTransferQuerySchema = z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().max(100).optional(),
    businessId: z.string().optional(),
    periodType: z.enum(['month', 'year']).optional(),
    year: z.coerce.number().optional(),
    month: z.coerce.number().min(1).max(12).optional(),
});

export const transferStatsQuerySchema = z.object({
    year: z.coerce.number().optional(),
    month: z.coerce.number().min(1).max(12).optional(),
});
