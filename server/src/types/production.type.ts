import { Types } from 'mongoose';

export type ProductionStatus =
    | 'in_progress'
    | 'partially_completed'
    | 'completed'
    | 'quality_check'
    | 'revision_required';

export type ProductionStage =
    | 'clipping_path'
    | 'masking'
    | 'retouching'
    | 'ghost_mannequin'
    | 'color_correction'
    | 'neck_joint'
    | 'shadow_creation'
    | 'vector_conversion'
    | 'other';

export interface IProductionStaffAssignment {
    staffId: Types.ObjectId;
    imageCount: number;
    notes?: string | undefined;
}

export interface IProductionQC {
    checkedBy?: Types.ObjectId | undefined;
    passedCount?: number | undefined;
    rejectedCount?: number | undefined;
    qcNotes?: string | undefined;
    checkedAt?: Date | undefined;
}

export interface IProductionRevision {
    isRevision?: boolean | undefined;
    revisionCount?: number | undefined;
    instructions?: string | undefined;
    resolvedCount?: number | undefined;
    previousLogId?: Types.ObjectId | undefined;
}

export interface IShiftProduction {
    _id?: Types.ObjectId | undefined;
    orderId: Types.ObjectId;
    shiftId: Types.ObjectId;
    branchId: Types.ObjectId;
    date: Date;
    teamLeaderId: Types.ObjectId;
    serviceId?: Types.ObjectId | undefined;
    stage?: ProductionStage | undefined;
    customStageName?: string | undefined;
    targetQuantity?: number | undefined;
    completedQuantity: number;
    status: ProductionStatus;
    assignedStaffs: IProductionStaffAssignment[];
    qc?: IProductionQC | undefined;
    revision?: IProductionRevision | undefined;
    handoverNotes?: string | undefined;
    bottlenecks?: string | undefined;
    isVerifiedByAdmin?: boolean | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}

export interface ICreateProductionLogDTO {
    orderId: string;
    shiftId: string;
    branchId?: string | undefined;
    date?: string | Date | undefined;
    teamLeaderId?: string | undefined;
    serviceId?: string | null | undefined;
    stage?: ProductionStage | undefined;
    customStageName?: string | undefined;
    targetQuantity?: number | undefined;
    completedQuantity: number;
    status?: ProductionStatus | undefined;
    assignedStaffs?: {
        staffId: string;
        imageCount: number;
        notes?: string | undefined;
    }[] | undefined;
    handoverNotes?: string | undefined;
    bottlenecks?: string | undefined;
}

export interface IUpdateProductionLogDTO {
    orderId?: string | undefined;
    shiftId?: string | undefined;
    branchId?: string | undefined;
    date?: string | Date | undefined;
    teamLeaderId?: string | undefined;
    serviceId?: string | null | undefined;
    stage?: ProductionStage | undefined;
    customStageName?: string | undefined;
    targetQuantity?: number | undefined;
    completedQuantity?: number | undefined;
    status?: ProductionStatus | undefined;
    assignedStaffs?: {
        staffId: string;
        imageCount: number;
        notes?: string | undefined;
    }[] | undefined;
    handoverNotes?: string | undefined;
    bottlenecks?: string | undefined;
    qc?: {
        checkedBy?: string | undefined;
        passedCount?: number | undefined;
        rejectedCount?: number | undefined;
        qcNotes?: string | undefined;
    } | undefined;
    revision?: {
        isRevision?: boolean | undefined;
        revisionCount?: number | undefined;
        instructions?: string | undefined;
        resolvedCount?: number | undefined;
    } | undefined;
    isVerifiedByAdmin?: boolean | undefined;
}

export interface IActiveOrdersProgressFilters {
    status?: string | undefined;
    filterType?: string | undefined;
    month?: number | undefined;
    year?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    sortBy?: string | undefined;
    stage?: string | undefined;
}

export interface IProductionQueryFilters {
    orderId?: string | undefined;
    shiftId?: string | undefined;
    branchId?: string | undefined;
    teamLeaderId?: string | undefined;
    serviceId?: string | undefined;
    stage?: string | undefined;
    status?: ProductionStatus | undefined;
    filterType?: string | undefined;
    month?: number | undefined;
    year?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}

