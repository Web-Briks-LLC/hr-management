import { z } from 'zod';

const teamMemberSchema = z.object({
    name: z.string().min(1, 'Team member name is required').max(100),
    email: z.string().email('Invalid team member email'),
    phone: z.string().optional(),
    designation: z.string().max(100).optional(),
});

export const createClientSchema = z.object({
    clientId: z
        .string({ message: 'Client ID is required' })
        .min(1, 'Client ID is required')
        .min(2, 'Client ID must be at least 2 characters')
        .max(50, 'Client ID must be at most 50 characters')
        .regex(
            /^[A-Za-z0-9_-]+$/,
            'Client ID can only contain letters, numbers, hyphens, and underscores',
        ),
    name: z
        .string({ message: 'Name is required' })
        .min(1, 'Name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters'),
    emails: z
        .array(z.string().email('Invalid email address'))
        .min(1, 'At least one email is required'),
    phone: z.string().optional(),
    address: z.string().max(500, 'Address too long').optional(),
    officeAddress: z.string().max(500, 'Office address too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    currency: z.string().max(10, 'Currency code too long').optional(),
    status: z.enum(['active', 'inactive']).default('active'),
    teamMembers: z.array(teamMemberSchema).optional(),
    assignedServices: z.array(z.string()).optional(),
});

export const updateClientSchema = z.object({
    clientId: z
        .string()
        .min(2, 'Client ID must be at least 2 characters')
        .max(50, 'Client ID must be at most 50 characters')
        .regex(
            /^[A-Za-z0-9_-]+$/,
            'Client ID can only contain letters, numbers, hyphens, and underscores',
        )
        .optional(),
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters')
        .optional(),
    emails: z
        .array(z.string().email('Invalid email address'))
        .min(1, 'At least one email is required')
        .optional(),
    phone: z.string().optional(),
    address: z.string().max(500, 'Address too long').optional(),
    officeAddress: z.string().max(500, 'Office address too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    currency: z.string().max(10, 'Currency code too long').optional(),
    status: z.enum(['active', 'inactive']).optional(),
    teamMembers: z.array(teamMemberSchema).optional(),
    assignedServices: z.array(z.string()).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
