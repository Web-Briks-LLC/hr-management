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

export const STAGE_LABELS: Record<ProductionStage, string> = {
    clipping_path: 'Clipping Path',
    masking: 'Masking',
    retouching: 'Retouching',
    ghost_mannequin: 'Ghost Mannequin',
    color_correction: 'Color Correction',
    neck_joint: 'Neck Joint',
    shadow_creation: 'Shadow Creation',
    vector_conversion: 'Vector Conversion',
    other: 'Other Services',
};

export const STATUS_LABELS: Record<ProductionStatus, { label: string; color: string; bg: string }> = {
    in_progress: {
        label: 'In Progress',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
    },
    partially_completed: {
        label: 'Partially Completed',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
    },
    completed: {
        label: 'Completed',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    },
    quality_check: {
        label: 'Quality Check',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400',
    },
    revision_required: {
        label: 'Revision Required',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
    },
};

export interface IProductionStaffAssignment {
    staffId: {
        _id: string;
        staffId: string;
        phone?: string;
        department?: string;
        designation?: string;
        userId?: {
            _id: string;
            name: string;
            email: string;
        };
    };
    imageCount: number;
    notes?: string;
}

export interface IProductionQC {
    checkedBy?: {
        _id: string;
        name: string;
        email: string;
    };
    passedCount?: number;
    rejectedCount?: number;
    qcNotes?: string;
    checkedAt?: string;
}

export interface IProductionRevision {
    isRevision?: boolean;
    revisionCount?: number;
    instructions?: string;
    resolvedCount?: number;
    previousLogId?: string;
}

export interface IShiftProduction {
    _id: string;
    orderId: {
        _id: string;
        orderName: string;
        imageQuantity: number;
        status: string;
        priority: string;
        deadline: string;
        clientId?: {
            _id: string;
            name: string;
            clientCode?: string;
            email?: string;
        };
        services?: {
            _id: string;
            name: string;
        }[];
    };
    shiftId: {
        _id: string;
        name: string;
        code: string;
        startTime?: string;
        endTime?: string;
    };
    branchId: {
        _id: string;
        name: string;
    };
    date: string;
    teamLeaderId: {
        _id: string;
        name: string;
        email: string;
    };
    serviceId?: {
        _id: string;
        name: string;
    };
    stage: ProductionStage;
    customStageName?: string;
    targetQuantity?: number;
    completedQuantity: number;
    status: ProductionStatus;
    assignedStaffs: IProductionStaffAssignment[];
    qc?: IProductionQC;
    revision?: IProductionRevision;
    handoverNotes?: string;
    bottlenecks?: string;
    isVerifiedByAdmin?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IActiveOrderProductionProgress {
    _id: string;
    orderName: string;
    orderDate: string;
    deadline: string;
    imageQuantity: number;
    priority: string;
    status: string;
    clientId?: {
        _id: string;
        name: string;
        clientCode?: string;
        email?: string;
    };
    services?: {
        _id: string;
        name: string;
    }[];
    productionProgress: {
        totalOrdered: number;
        overallPercentage: number;
        stages: Record<string, {
            completed: number;
            lastUpdated: string;
            status: ProductionStatus;
            logsCount: number;
        }>;
        clippingPathCount: number;
        maskingCount: number;
        retouchingCount: number;
        ghostMannequinCount: number;
        remainingImages: number;
        totalRejected?: number;
        latestShiftLog?: {
            _id: string;
            shiftName: string;
            teamLeaderName: string;
            stage: ProductionStage;
            completedQuantity: number;
            status: ProductionStatus;
            handoverNotes?: string;
            date: string;
        } | null;
        totalShiftsLogged: number;
    };
}

export interface IActiveOrdersProgressFilters {
    branchId?: string;
    search?: string;
    status?: string;
    stage?: string;
    filterType?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
}

export interface IProductionStats {
    summary: {
        totalImages: number;
        todayImages: number;
        activeOrders: number;
        activeRevisions: number;
    };
    shiftComparison: {
        shiftName: string;
        shiftCode: string;
        imagesCompleted: number;
        logsCount: number;
    }[];
    stageBreakdown: {
        stage: ProductionStage;
        completedImages: number;
        logsCount: number;
    }[];
    dailyTrend: {
        date: string;
        completed: number;
        target: number;
    }[];
}

export interface ICreateProductionLogInput {
    orderId: string;
    shiftId: string;
    branchId?: string;
    date?: string;
    serviceId?: string;
    stage: ProductionStage;
    customStageName?: string;
    targetQuantity?: number;
    completedQuantity: number;
    status: ProductionStatus;
    assignedStaffs?: {
        staffId: string;
        imageCount: number;
        notes?: string;
    }[];
    handoverNotes?: string;
    bottlenecks?: string;
}

export interface IUpdateProductionLogInput extends Partial<ICreateProductionLogInput> {
    qc?: {
        checkedBy?: string;
        passedCount?: number;
        rejectedCount?: number;
        qcNotes?: string;
    };
    revision?: {
        isRevision?: boolean;
        revisionCount?: number;
        instructions?: string;
        resolvedCount?: number;
    };
    isVerifiedByAdmin?: boolean;
}

export interface ISubmitQCReviewInput {
    passedCount: number;
    rejectedCount: number;
    qcNotes?: string;
    requiresRevision?: boolean;
    revisionInstructions?: string;
}

export interface IProductionFilters {
    orderId?: string;
    shiftId?: string;
    branchId?: string;
    teamLeaderId?: string;
    serviceId?: string;
    stage?: string;
    status?: ProductionStatus;
    filterType?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
}
