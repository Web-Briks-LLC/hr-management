export type OrderStatus =
    | 'pending'
    | 'in_progress'
    | 'quality_check'
    | 'revision'
    | 'completed'
    | 'delivered'
    | 'cancelled';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface IService {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface IReturnFileFormat {
    _id: string;
    name: string;
    extension: string;
    description?: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

// Revision instruction entry
export interface IRevisionInstruction {
    instruction: string;
    createdAt: string;
    createdBy: string; // User ID (not populated)
}

// Timeline entry for tracking order history
export interface ITimelineEntry {
    status: OrderStatus;
    timestamp: string;
    changedBy: string; // User ID (not populated)
    note?: string;
}

export interface IOrder {
    _id: string;
    orderName: string;
    clientId: {
        _id: string;
        clientId: string;
        name: string;
        email: string;
    };
    orderDate: string;
    deadline: string;
    originalDeadline?: string;
    imageQuantity: number;
    perImagePrice: number;
    totalPrice: number;
    services: {
        _id: string;
        name: string;
    }[];
    returnFileFormat: {
        _id: string;
        name: string;
        extension: string;
    };
    instruction?: string;
    status: OrderStatus;
    priority: OrderPriority;
    assignedTo?: {
        _id: string;
        staffId: string;
        userId: {
            name: string;
        };
    };
    notes?: string;
    revisionCount: number;
    revisionInstructions: IRevisionInstruction[];
    timeline: ITimelineEntry[];
    completedAt?: string;
    deliveredAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface IOrderStats {
    total: number;
    pending: number;
    inProgress: number;
    qualityCheck: number;
    revision: number;
    completed: number;
    delivered: number;
    overdue: number;
}

export interface CreateOrderInput {
    orderName: string;
    clientId: string;
    orderDate: string;
    deadline: string;
    imageQuantity: number;
    perImagePrice: number;
    totalPrice: number;
    services: string[];
    returnFileFormat: string;
    instruction?: string;
    priority?: OrderPriority;
    assignedTo?: string;
    notes?: string;
}

export interface UpdateOrderInput extends Partial<CreateOrderInput> {
    status?: OrderStatus;
}

export interface UpdateStatusInput {
    status: OrderStatus;
    note?: string;
}

export interface ExtendDeadlineInput {
    newDeadline: string;
    reason?: string;
}

export interface AddRevisionInput {
    instruction: string;
}

export interface CreateServiceInput {
    name: string;
    description?: string;
}

export interface UpdateServiceInput {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export interface CreateReturnFileFormatInput {
    name: string;
    extension: string;
    description?: string;
}

export interface UpdateReturnFileFormatInput {
    name?: string;
    extension?: string;
    description?: string;
    isActive?: boolean;
}

export interface OrderFilters {
    clientId?: string;
    status?: OrderStatus;
    priority?: OrderPriority;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
    search?: string;
    page?: number;
    limit?: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    quality_check: 'Quality Check',
    revision: 'Revision',
    completed: 'Completed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
};
