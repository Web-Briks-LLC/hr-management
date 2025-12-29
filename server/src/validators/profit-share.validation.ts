import { z } from 'zod';

export const createShareholderSchema = z.object({
    name: z
        .string({ message: 'Name is required' })
        .min(1, 'Name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters'),
    email: z
        .string({ message: 'Email is required' })
        .min(1, 'Email is required')
        .email('Invalid email address'),
    percentage: z
        .number({ message: 'Percentage is required' })
        .min(0.01, 'Percentage must be at least 0.01%')
        .max(100, 'Percentage cannot exceed 100%'),
});

export const updateShareholderSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .optional(),
    email: z.string().email('Invalid email address').optional(),
    percentage: z
        .number()
        .min(0.01, 'Percentage must be at least 0.01%')
        .max(100, 'Percentage cannot exceed 100%')
        .optional(),
    isActive: z.boolean().optional(),
});

export const distributeProfitSchema = z
    .object({
        shareholderIds: z
            .array(z.string())
            .min(1, 'At least one shareholder must be selected'),
        periodType: z.enum(['month', 'year'], {
            message: 'Period type must be "month" or "year"',
        }),
        month: z.number().min(1).max(12).optional(),
        year: z
            .number({ message: 'Year is required' })
            .min(2000, 'Year must be 2000 or later')
            .max(2100, 'Year must be 2100 or earlier'),
        notes: z.string().max(500, 'Notes too long').optional(),
    })
    .refine(
        (data) => {
            // If periodType is 'month', month is required
            if (data.periodType === 'month' && !data.month) {
                return false;
            }
            return true;
        },
        {
            message: 'Month is required when period type is "month"',
            path: ['month'],
        }
    );

export const profitSummaryQuerySchema = z.object({
    periodType: z.enum(['month', 'year']).optional().default('month'),
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2000).max(2100),
});

export type CreateShareholderInput = z.infer<typeof createShareholderSchema>;
export type UpdateShareholderInput = z.infer<typeof updateShareholderSchema>;
export type DistributeProfitInput = z.infer<typeof distributeProfitSchema>;
export type ProfitSummaryQuery = z.infer<typeof profitSummaryQuerySchema>;
