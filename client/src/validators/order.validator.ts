import { z } from 'zod';

export const createServiceSchema = z.object({
    name: z
        .string()
        .min(2, 'Service name must be at least 2 characters')
        .max(100, 'Service name must be at most 100 characters'),
    description: z
        .string()
        .max(500, 'Description must be at most 500 characters')
        .optional(),
});

export const createReturnFileFormatSchema = z.object({
    name: z
        .string()
        .min(1, 'Format name is required')
        .max(20, 'Format name must be at most 20 characters'),
    extension: z
        .string()
        .min(1, 'Extension is required')
        .max(10, 'Extension must be at most 10 characters')
        .regex(
            /^[a-zA-Z0-9]+$/,
            'Extension must contain only letters and numbers'
        ),
    description: z
        .string()
        .max(200, 'Description must be at most 200 characters')
        .optional(),
});

export const createOrderSchema = z.object({
    orderName: z
        .string()
        .min(2, 'Order name must be at least 2 characters')
        .max(200, 'Order name must be at most 200 characters'),
    clientId: z.string().min(1, 'Client is required'),
    orderDate: z.string().min(1, 'Order date is required'),
    deadline: z.string().min(1, 'Deadline is required'),
    imageQuantity: z
        .number()
        .min(1, 'Image quantity must be at least 1')
        .or(z.string().transform((val) => parseInt(val, 10)))
        .refine((val) => !isNaN(val as number) && (val as number) >= 1, {
            message: 'Image quantity must be at least 1',
        }),
    perImagePrice: z
        .number()
        .min(0, 'Per image price must be positive')
        .or(z.string().transform((val) => parseFloat(val)))
        .refine((val) => !isNaN(val as number) && (val as number) >= 0, {
            message: 'Per image price must be a positive number',
        }),
    totalPrice: z
        .number()
        .min(0, 'Total price must be positive')
        .or(z.string().transform((val) => parseFloat(val)))
        .refine((val) => !isNaN(val as number) && (val as number) >= 0, {
            message: 'Total price must be a positive number',
        }),
    services: z.array(z.string()).min(1, 'At least one service is required'),
    returnFileFormat: z.string().min(1, 'Return file format is required'),
    instruction: z
        .string()
        .max(2000, 'Instruction must be at most 2000 characters')
        .optional(),
    priority: z
        .enum(['low', 'normal', 'high', 'urgent'])
        .optional()
        .default('normal'),
    contactPersonId: z.string().optional(),
    notes: z
        .string()
        .max(1000, 'Notes must be at most 1000 characters')
        .optional(),
});

export const updateOrderSchema = createOrderSchema.partial().extend({
    status: z
        .enum([
            'pending',
            'in_progress',
            'quality_check',
            'revision',
            'completed',
            'delivered',
            'cancelled',
        ])
        .optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateReturnFileFormatInput = z.infer<
    typeof createReturnFileFormatSchema
>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
