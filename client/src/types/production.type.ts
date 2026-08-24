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

export interface ISanitizedProductionOrder {
    _id: string;
    orderName: string;
    clientId?: {
        _id: string;
        clientId: string;
        name: string;
    };
    deadline: string;
    originalDeadline?: string;
    imageQuantity: number;
    services: {
        _id: string;
        name: string;
        description?: string;
    }[];
    requiredSteps: {
        stepId?: string;
        name: string;
        code: string;
        serviceId?: string;
        order?: number;
    }[];
    returnFileFormat?: {
        _id: string;
        name: string;
        extension: string;
    };
    instruction?: string;
    priority: string;
    notes?: string;
    status: string;
    createdAt: string;
    imageStats: {
        totalExpected: number;
        totalRegistered: number;
        completedCount: number;
        inProgressCount: number;
        partiallyCompletedCount: number;
        pendingQcCount: number;
        revisionCount: number;
        unassignedCount: number;
    };
}

export interface IImageCompletedStep {
    stepName: string;
    completedBy: {
        _id: string;
        name?: string;
        staffId?: string;
        designation?: string;
    };
    shiftId?: string | null;
    completedAt: string;
    durationSeconds?: number;
    sessionId?: string | null;
}

export interface IImageRevisionEntry {
    instruction: string;
    requestedBy: {
        _id: string;
        name?: string;
        email?: string;
        role?: string;
    };
    createdAt: string;
    resolvedAt?: string | null;
    resolvedBy?: {
        _id: string;
        name?: string;
        staffId?: string;
    } | null;
}

export interface IOrderImage {
    _id: string;
    orderId: string;
    imageName: string;
    status: 'unassigned' | 'in_progress' | 'partially_completed' | 'pending_qc' | 'completed' | 'in_revision';
    requiredSteps: string[];
    completedSteps: IImageCompletedStep[];
    currentAssignedStaffId?: {
        _id: string;
        name?: string;
        staffId?: string;
        employeeId?: string;
        designation?: string;
        branchId?: string;
    } | null;
    currentSessionId?: string | null;
    lockedAt?: string | null;
    isRevision: boolean;
    revisionHistory: IImageRevisionEntry[];
    qcApprovedBy?: {
        _id: string;
        name?: string;
    } | null;
    qcApprovedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface IOrderImageStatusResponse {
    order: {
        _id: string;
        orderName: string;
        deadline: string;
        imageQuantity: number;
        requiredSteps: {
            stepId?: string;
            name: string;
            code: string;
            serviceId?: string;
        }[];
        instruction?: string;
    };
    images: IOrderImage[];
    summary: {
        totalExpected: number;
        totalRegistered: number;
        completedCount: number;
        inProgressCount: number;
        partiallyCompletedCount: number;
        pendingQcCount: number;
        revisionCount: number;
        unassignedCount: number;
    };
}

export interface IProductionWorkSession {
    _id: string;
    staffId: string;
    orderId: {
        _id: string;
        orderName: string;
        deadline?: string;
        requiredSteps?: {
            name: string;
            code: string;
        }[];
        instruction?: string;
        notes?: string;
        priority?: string;
        services?: {
            _id: string;
            name: string;
            description?: string;
        }[];
    } | string;
    shiftId?: string | null;
    branchId?: string | null;
    imageNames: string[];
    imageCount: number;
    startTime: string;
    endTime?: string | null;
    durationSeconds: number;
    status: 'active' | 'completed' | 'cancelled' | 'paused';
    completedSteps: string[];
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface IStaffPerformanceAnalytics {
    summary: {
        totalImages: number;
        totalSessions: number;
        totalHours: number;
        activeStaffCount: number;
    };
    staffPerformance: {
        staffId: string;
        staffName: string;
        employeeId: string;
        designation: string;
        totalSessions: number;
        totalImages: number;
        totalHours: number;
        avgSecondsPerImage: number;
    }[];
    shiftPerformance: {
        shiftId?: string;
        shiftName: string;
        shiftCode?: string;
        totalImages: number;
        totalSessions: number;
        totalHours: number;
    }[];
    stepBreakdown: {
        stepName: string;
        count: number;
    }[];
}

export interface IStartWorkSessionInput {
    orderId: string;
    imageNames: string[];
    shiftId?: string;
}

export interface IFinishWorkSessionInput {
    sessionId: string;
    completedSteps: string[];
    notes?: string;
}

export interface ICancelWorkSessionInput {
    sessionId: string;
    reason?: string;
}

export interface IFlagImageRevisionInput {
    orderId: string;
    imageNames: string[];
    instruction: string;
}

export interface IQcApproveImagesInput {
    orderId: string;
    imageNames: string[];
}

export interface IStaffImageSummary {
    totalImagesWorked: number;
    todayImagesWorked: number;
    qcApprovedCount: number;
    revisionCount: number;
    totalWorkSessions: number;
    totalWorkSeconds: number;
    avgSecondsPerImage: number;
}

export interface IStaffEditedImageItem {
    _id: string;
    orderId: {
        _id: string;
        orderName: string;
        imageQuantity: number;
        priority: string;
        deadline: string;
        status: string;
        clientId?: {
            _id: string;
            name: string;
            clientCode?: string;
            email?: string;
        };
    };
    imageName: string;
    status: 'unassigned' | 'in_progress' | 'partially_completed' | 'pending_qc' | 'completed' | 'in_revision';
    requiredSteps: string[];
    completedSteps: {
        stepName: string;
        completedBy: {
            _id: string;
            staffId: string;
            userId?: { name: string; email?: string };
        };
        shiftId?: { _id: string; name: string; code: string };
        completedAt: string;
        durationSeconds?: number;
        sessionId?: string;
    }[];
    isRevision: boolean;
    revisionHistory: {
        instruction: string;
        requestedBy?: { name: string; email?: string };
        createdAt: string;
        resolvedAt?: string;
        resolvedBy?: { staffId: string; userId?: { name: string } };
    }[];
    qcApprovedBy?: { _id: string; name: string; email: string };
    qcApprovedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface IStaffEditedImagesResponse {
    success: boolean;
    data: {
        summary: IStaffImageSummary;
        images: IStaffEditedImageItem[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
}

export interface IStaffEditedImagesFilters {
    staffId?: string;
    search?: string;
    status?: string;
    step?: string;
    filterType?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
    page?: number;
    limit?: number;
}

