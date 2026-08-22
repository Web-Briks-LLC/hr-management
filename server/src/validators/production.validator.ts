import { z } from 'zod';

export const productionStaffAssignmentSchema = z.object({
    staffId: z.string({ message: 'Staff ID is required' }),
    imageCount: z.number().min(0, 'Image count cannot be negative').default(0),
    notes: z.string().max(500).optional(),
});

export const productionQCSchema = z.object({
    passedCount: z.number().min(0).default(0),
    rejectedCount: z.number().min(0).default(0),
    qcNotes: z.string().max(1000).optional(),
});

export const productionRevisionSchema = z.object({
    isRevision: z.boolean().default(false),
    revisionCount: z.number().min(0).default(0),
    instructions: z.string().max(2000).optional(),
    resolvedCount: z.number().min(0).default(0),
    previousLogId: z.string().optional(),
});

export const createProductionLogSchema = z.object({
    orderId: z.string({ message: 'Order ID is required' }),
    shiftId: z.string({ message: 'Shift ID is required' }),
    branchId: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    serviceId: z.string().optional().nullable(),
    stage: z.enum([
        'clipping_path',
        'masking',
        'retouching',
        'ghost_mannequin',
        'color_correction',
        'neck_joint',
        'shadow_creation',
        'vector_conversion',
        'other',
    ]).default('clipping_path'),
    customStageName: z.string().max(100).optional(),
    targetQuantity: z.number().min(0).optional().default(0),
    completedQuantity: z.number().min(0, 'Completed quantity must be 0 or more').default(0),
    status: z.enum([
        'in_progress',
        'partially_completed',
        'completed',
        'quality_check',
        'revision_required',
    ]).default('in_progress'),
    assignedStaffs: z.array(productionStaffAssignmentSchema).optional().default([]),
    handoverNotes: z.string().max(2000).optional(),
    bottlenecks: z.string().max(2000).optional(),
});

export const updateProductionLogSchema = createProductionLogSchema.partial().extend({
    qc: productionQCSchema.optional(),
    revision: productionRevisionSchema.optional(),
    isVerifiedByAdmin: z.boolean().optional(),
});

export const submitQCReviewSchema = z.object({
    passedCount: z.number().min(0),
    rejectedCount: z.number().min(0),
    qcNotes: z.string().max(1000).optional(),
    requiresRevision: z.boolean().default(false),
    revisionInstructions: z.string().max(2000).optional(),
});

export const shiftHandoverSchema = z.object({
    shiftId: z.string({ message: 'Current Shift ID is required' }),
    nextShiftId: z.string().optional(),
    branchId: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    handoverNotes: z.string().min(1, 'Handover notes are required').max(3000),
    priorityOrderIds: z.array(z.string()).optional(),
    bottlenecks: z.string().max(2000).optional(),
});

export const startWorkSessionSchema = z.object({
    orderId: z.string({ message: 'Order ID is required' }),
    imageNames: z
        .array(z.string().min(1, 'Image name cannot be empty'))
        .min(1, 'At least one image name is required'),
    shiftId: z.string().optional(),
});

export const finishWorkSessionSchema = z.object({
    sessionId: z.string({ message: 'Session ID is required' }),
    completedSteps: z
        .array(z.string().min(1, 'Step name cannot be empty'))
        .min(1, 'Select at least one completed step'),
    notes: z.string().max(1000).optional(),
});

export const cancelWorkSessionSchema = z.object({
    sessionId: z.string({ message: 'Session ID is required' }),
    reason: z.string().max(500).optional(),
});

export const flagImageRevisionSchema = z.object({
    orderId: z.string({ message: 'Order ID is required' }),
    imageNames: z
        .array(z.string().min(1, 'Image name cannot be empty'))
        .min(1, 'At least one image name is required'),
    instruction: z.string().min(1, 'Revision instruction is required').max(2000),
});

export type CreateProductionLogInput = z.infer<typeof createProductionLogSchema>;
export type UpdateProductionLogInput = z.infer<typeof updateProductionLogSchema>;
export type SubmitQCReviewInput = z.infer<typeof submitQCReviewSchema>;
export type ShiftHandoverInput = z.infer<typeof shiftHandoverSchema>;
export type StartWorkSessionInput = z.infer<typeof startWorkSessionSchema>;
export type FinishWorkSessionInput = z.infer<typeof finishWorkSessionSchema>;
export type CancelWorkSessionInput = z.infer<typeof cancelWorkSessionSchema>;
export type FlagImageRevisionInput = z.infer<typeof flagImageRevisionSchema>;

