import type { Document, Types } from 'mongoose';

export type OrderStatus =
    | 'pending'
    | 'in_progress'
    | 'quality_check'
    | 'revision'
    | 'completed'
    | 'delivered'
    | 'cancelled';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

// Revision instruction entry
export interface IRevisionInstruction {
    instruction: string;
    createdAt: Date;
    createdBy: Types.ObjectId;
}

// Timeline entry for tracking order history
export interface ITimelineEntry {
    status: OrderStatus;
    timestamp: Date;
    changedBy: Types.ObjectId;
    note?: string;
}

export interface IOrder extends Document {
    _id: Types.ObjectId;
    orderName: string;
    clientId: Types.ObjectId;
    orderDate: Date;
    deadline: Date;
    originalDeadline?: Date; // Stores original deadline when extended
    imageQuantity: number;
    perImagePrice: number;
    totalPrice: number;
    services: Types.ObjectId[];
    returnFileFormat: Types.ObjectId;
    instruction?: string;
    status: OrderStatus;
    priority: OrderPriority;
    assignedTo?: Types.ObjectId;
    notes?: string;
    revisionCount: number;
    isLegacy?: boolean; // Flag for migrated orders
    revisionInstructions: IRevisionInstruction[];
    timeline: ITimelineEntry[];
    completedAt?: Date;
    deliveredAt?: Date;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Populated version for API responses
export interface IOrderPopulated
    extends Omit<
        IOrder,
        | 'clientId'
        | 'services'
        | 'returnFileFormat'
        | 'assignedTo'
        | 'revisionInstructions'
        | 'timeline'
    > {
    clientId: {
        _id: Types.ObjectId;
        clientId: string;
        name: string;
        email: string;
    };
    services: {
        _id: Types.ObjectId;
        name: string;
    }[];
    returnFileFormat: {
        _id: Types.ObjectId;
        name: string;
        extension: string;
    };
    assignedTo?: {
        _id: Types.ObjectId;
        staffId: string;
        userId: {
            name: string;
        };
    };
    revisionInstructions: {
        instruction: string;
        createdAt: Date;
        createdBy: {
            _id: Types.ObjectId;
            name: string;
        };
    }[];
    timeline: {
        status: OrderStatus;
        timestamp: Date;
        changedBy: {
            _id: Types.ObjectId;
            name: string;
        };
        note?: string;
    }[];
}
