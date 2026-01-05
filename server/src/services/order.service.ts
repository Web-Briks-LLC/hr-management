import OrderModel from '../models/order.model.js';
import ClientModel from '../models/client.model.js';
import type {
    IOrder,
    OrderStatus,
    OrderPriority,
} from '../types/order.type.js';
import mongoose from 'mongoose';

interface CreateOrderData {
    orderName: string;
    clientId: string;
    orderDate: Date;
    deadline: Date;
    imageQuantity: number;
    perImagePrice: number;
    totalPrice: number;
    services: string[];
    returnFileFormat: string;
    instruction?: string;
    priority?: OrderPriority;
    assignedTo?: string;
    notes?: string;
    createdBy: string;
}

interface UpdateOrderData {
    orderName?: string;
    clientId?: string;
    orderDate?: Date;
    deadline?: Date;
    imageQuantity?: number;
    perImagePrice?: number;
    totalPrice?: number;
    services?: string[];
    returnFileFormat?: string;
    instruction?: string;
    status?: OrderStatus;
    priority?: OrderPriority;
    assignedTo?: string | null;
    notes?: string;
    completedAt?: Date;
    deliveredAt?: Date;
}

interface GetOrdersFilters {
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

async function createOrderInDB(data: CreateOrderData): Promise<IOrder> {
    // Create order with initial timeline entry
    const orderData = {
        ...data,
        revisionCount: 0,
        revisionInstructions: [],
        timeline: [
            {
                status: 'pending' as OrderStatus,
                timestamp: new Date(),
                changedBy: data.createdBy,
                note: 'Order created',
            },
        ],
    };

    const order = await OrderModel.create(orderData as unknown as IOrder);
    return order;
}

async function getAllOrdersFromDB(filters: GetOrdersFilters): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const {
        clientId,
        status,
        priority,
        assignedTo,
        startDate,
        endDate,
        month,
        year,
        search,
        page = 1,
        limit = 20,
    } = filters;

    const query: Record<string, unknown> = {};

    if (clientId) {
        query.clientId = clientId;
    }

    if (status) {
        query.status = status;
    }

    if (priority) {
        query.priority = priority;
    }

    if (assignedTo) {
        query.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
        query.orderDate = {};
        if (startDate) {
            (query.orderDate as Record<string, unknown>).$gte = new Date(
                startDate
            );
        }
        if (endDate) {
            (query.orderDate as Record<string, unknown>).$lte = new Date(
                endDate
            );
        }
    }

    // Month and Year filtering
    if (month || year) {
        const filterYear = year || new Date().getFullYear();

        if (month) {
            // Filter by specific month and year
            const startOfMonth = new Date(filterYear, month - 1, 1);
            const endOfMonth = new Date(filterYear, month, 0, 23, 59, 59, 999);
            query.orderDate = {
                ...((query.orderDate as Record<string, unknown>) || {}),
                $gte: startOfMonth,
                $lte: endOfMonth,
            };
        } else {
            // Filter by year only
            const startOfYear = new Date(filterYear, 0, 1);
            const endOfYear = new Date(filterYear, 11, 31, 23, 59, 59, 999);
            query.orderDate = {
                ...((query.orderDate as Record<string, unknown>) || {}),
                $gte: startOfYear,
                $lte: endOfYear,
            };
        }
    }

    if (search) {
        // Find clients matching the search term
        const matchingClients = await ClientModel.find({
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { clientId: { $regex: search, $options: 'i' } },
            ],
        }).select('_id');

        const matchingClientIds = matchingClients.map((client) => client._id);

        query.$or = [
            { orderName: { $regex: search, $options: 'i' } },
            { clientId: { $in: matchingClientIds } },
        ];
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
        OrderModel.find(query)
            .populate(
                'clientId',
                'clientId name email currency officeAddress address'
            )
            .populate('services', 'name')
            .populate('returnFileFormat', 'name extension')
            .populate({
                path: 'assignedTo',
                select: 'staffId userId',
                populate: {
                    path: 'userId',
                    select: 'name',
                },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        OrderModel.countDocuments(query),
    ]);

    return {
        orders: orders as IOrder[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

async function getOrderByIdFromDB(id: string): Promise<IOrder | null> {
    const order = await OrderModel.findById(id)
        .populate(
            'clientId',
            'clientId name email phone currency officeAddress address'
        )
        .populate('services', 'name description')
        .populate('returnFileFormat', 'name extension')
        .populate({
            path: 'assignedTo',
            select: 'staffId userId',
            populate: {
                path: 'userId',
                select: 'name email',
            },
        })
        .lean();

    if (order && order.createdBy) {
        // Manually fetch createdBy user since it's a native collection
        const { default: UserModel } = await import('../models/user.model.js');
        const user = await UserModel.findOne(
            { _id: new mongoose.Types.ObjectId(order.createdBy.toString()) },
            { projection: { name: 1, email: 1 } }
        );
        if (user) {
            // @ts-ignore
            order.createdBy = user;
        }
    }
    return order;
}

async function updateOrderInDB(
    id: string,
    data: UpdateOrderData
): Promise<IOrder | null> {
    // Handle status changes
    if (data.status === 'completed' && !data.completedAt) {
        data.completedAt = new Date();
    }
    if (data.status === 'delivered' && !data.deliveredAt) {
        data.deliveredAt = new Date();
    }

    return OrderModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    })
        .populate(
            'clientId',
            'clientId name email currency officeAddress address'
        )
        .populate('services', 'name')
        .populate('returnFileFormat', 'name extension')
        .populate({
            path: 'assignedTo',
            select: 'staffId userId',
            populate: {
                path: 'userId',
                select: 'name',
            },
        })
        .lean();
}

async function deleteOrderFromDB(id: string): Promise<IOrder | null> {
    return OrderModel.findByIdAndDelete(id).lean();
}

// Update status with timeline tracking
async function updateOrderStatusWithTimeline(
    id: string,
    status: OrderStatus,
    changedBy: string,
    note?: string
): Promise<IOrder | null> {
    const updateData: Record<string, unknown> = {
        status,
        $push: {
            timeline: {
                status,
                timestamp: new Date(),
                changedBy,
                note: note || `Status changed to ${status}`,
            },
        },
    };

    if (status === 'completed') {
        updateData.completedAt = new Date();
    }
    if (status === 'delivered') {
        updateData.deliveredAt = new Date();
    }
    if (status === 'revision') {
        updateData.$inc = { revisionCount: 1 };
    }

    return OrderModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate(
            'clientId',
            'clientId name email currency officeAddress address'
        )
        .populate('services', 'name')
        .populate('returnFileFormat', 'name extension')
        .populate({
            path: 'assignedTo',
            select: 'staffId userId',
            populate: {
                path: 'userId',
                select: 'name',
            },
        })
        .lean();
}

// Extend deadline
async function extendDeadline(
    id: string,
    newDeadline: Date,
    reason: string,
    changedBy: string
): Promise<IOrder | null> {
    // Get current order to preserve original deadline
    const order = await OrderModel.findById(id);
    if (!order) return null;

    const updateData: Record<string, unknown> = {
        deadline: newDeadline,
        $push: {
            timeline: {
                status: order.status,
                timestamp: new Date(),
                changedBy,
                note: `Deadline extended: ${reason}`,
            },
        },
    };

    // Store original deadline if not already stored
    if (!order.originalDeadline) {
        updateData.originalDeadline = order.deadline;
    }

    return OrderModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate(
            'clientId',
            'clientId name email currency officeAddress address'
        )
        .populate('services', 'name')
        .populate('returnFileFormat', 'name extension')
        .lean();
}

// Add revision instruction
async function addRevision(
    id: string,
    instruction: string,
    createdBy: string
): Promise<IOrder | null> {
    const updateData = {
        status: 'revision' as OrderStatus,
        $inc: { revisionCount: 1 },
        $push: {
            revisionInstructions: {
                instruction,
                createdAt: new Date(),
                createdBy,
            },
            timeline: {
                status: 'revision' as OrderStatus,
                timestamp: new Date(),
                changedBy: createdBy,
                note: 'Revision requested',
            },
        },
    };

    return OrderModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate(
            'clientId',
            'clientId name email currency officeAddress address'
        )
        .populate('services', 'name')
        .populate('returnFileFormat', 'name extension')
        .lean();
}

async function getOrderStatsFromDB(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    qualityCheck: number;
    revision: number;
    completed: number;
    delivered: number;
    overdue: number;
}> {
    const now = new Date();
    const [
        total,
        pending,
        inProgress,
        qualityCheck,
        revision,
        completed,
        delivered,
        overdue,
    ] = await Promise.all([
        OrderModel.countDocuments(),
        OrderModel.countDocuments({ status: 'pending' }),
        OrderModel.countDocuments({ status: 'in_progress' }),
        OrderModel.countDocuments({ status: 'quality_check' }),
        OrderModel.countDocuments({ status: 'revision' }),
        OrderModel.countDocuments({ status: 'completed' }),
        OrderModel.countDocuments({ status: 'delivered' }),
        OrderModel.countDocuments({
            deadline: { $lt: now },
            status: { $nin: ['completed', 'delivered', 'cancelled'] },
        }),
    ]);

    return {
        total,
        pending,
        inProgress,
        qualityCheck,
        revision,
        completed,
        delivered,
        overdue,
    };
}

async function getOrdersByClientFromDB(
    clientId: string,
    limit: number = 10
): Promise<IOrder[]> {
    return OrderModel.find({ clientId })
        .populate('services', 'name')
        .populate('returnFileFormat', 'name extension')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean() as Promise<IOrder[]>;
}

// Get distinct years from orders
async function getOrderYearsFromDB(): Promise<number[]> {
    const result = await OrderModel.aggregate([
        {
            $group: {
                _id: { $year: '$orderDate' },
            },
        },
        {
            $sort: { _id: -1 }, // Sort descending (newest first)
        },
    ]);
    return result.map((r) => r._id);
}

export default {
    createOrderInDB,
    getAllOrdersFromDB,
    getOrderByIdFromDB,
    updateOrderInDB,
    deleteOrderFromDB,
    updateOrderStatusWithTimeline,
    extendDeadline,
    addRevision,
    getOrderStatsFromDB,
    getOrdersByClientFromDB,
    getOrderYearsFromDB,
};
