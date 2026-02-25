import OrderModel from "../models/order.model.js";
import ClientModel from "../models/client.model.js";
import type {
    IOrder,
    OrderStatus,
    OrderPriority,
} from "../types/order.type.js";
import mongoose from "mongoose";
import earningService from "./earning.service.js";
import { escapeRegex } from "../lib/sanitize.js";

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
                status: "pending" as OrderStatus,
                timestamp: new Date(),
                changedBy: data.createdBy,
                note: "Order created",
            },
        ],
    };

    const order = await OrderModel.create(orderData as unknown as IOrder);

    // Auto-create or update monthly earning for this order
    try {
        // Get client to fetch currency
        const client = await ClientModel.findById(data.clientId).lean();
        const currency =
            (client as { currency?: string } | null)?.currency || "USD";

        await earningService.createEarningForOrder({
            orderId: (order._id as mongoose.Types.ObjectId).toString(),
            clientId: data.clientId,
            orderDate: data.orderDate,
            orderAmount: data.totalPrice,
            imageQty: data.imageQuantity,
            currency,
            createdBy: data.createdBy,
        });
    } catch (err) {
        console.error("Error auto-creating earning for order:", err);
        // Don't fail order creation if earning creation fails
    }

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

    const pipeline: any[] = [];

    // Match stage construction
    const matchStage: Record<string, unknown> = {};

    if (clientId) {
        matchStage.clientId = new mongoose.Types.ObjectId(clientId);
    }

    if (status) {
        matchStage.status = status;
    }

    if (priority) {
        matchStage.priority = priority;
    }

    if (assignedTo) {
        matchStage.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (startDate || endDate) {
        matchStage.orderDate = {};
        if (startDate) {
            (matchStage.orderDate as Record<string, unknown>).$gte = new Date(
                startDate,
            );
        }
        if (endDate) {
            (matchStage.orderDate as Record<string, unknown>).$lte = new Date(
                endDate,
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
            matchStage.orderDate = {
                ...((matchStage.orderDate as Record<string, unknown>) || {}),
                $gte: startOfMonth,
                $lte: endOfMonth,
            };
        } else {
            // Filter by year only
            const startOfYear = new Date(filterYear, 0, 1);
            const endOfYear = new Date(filterYear, 11, 31, 23, 59, 59, 999);
            matchStage.orderDate = {
                ...((matchStage.orderDate as Record<string, unknown>) || {}),
                $gte: startOfYear,
                $lte: endOfYear,
            };
        }
    }

    if (search) {
        // We'll handle search later in the pipeline or use a separate lookup for clients if needed
        // But for now, let's keep the existing logic: find clients first then filter orders
        const matchingClients = await ClientModel.find({
            $or: [
                { name: { $regex: escapeRegex(search), $options: "i" } },
                { clientId: { $regex: escapeRegex(search), $options: "i" } },
            ],
        }).select("_id");

        const matchingClientIds = matchingClients.map((client) => client._id);

        matchStage.$or = [
            { orderName: { $regex: escapeRegex(search), $options: "i" } },
            { clientId: { $in: matchingClientIds } },
        ];
    }

    pipeline.push({ $match: matchStage });

    // Lookups (Population replacement)

    // Client
    pipeline.push({
        $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "clientId",
        },
    });
    pipeline.push({
        $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true },
    });

    // Services
    pipeline.push({
        $lookup: {
            from: "services",
            localField: "services",
            foreignField: "_id",
            as: "services",
        },
    });

    // ReturnFileFormat
    pipeline.push({
        $lookup: {
            from: "returnfileformats", // Verify collection name usually lowecase plural
            localField: "returnFileFormat",
            foreignField: "_id",
            as: "returnFileFormat",
        },
    });
    pipeline.push({
        $unwind: {
            path: "$returnFileFormat",
            preserveNullAndEmptyArrays: true,
        },
    });

    // AssignedTo (Staff) and nested User
    pipeline.push({
        $lookup: {
            from: "staffs",
            localField: "assignedTo",
            foreignField: "_id",
            as: "assignedTo",
        },
    });
    pipeline.push({
        $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true },
    });

    // Nested User lookup for Staff
    pipeline.push({
        $lookup: {
            from: "user", // Native user collection
            localField: "assignedTo.userId",
            foreignField: "_id",
            as: "assignedTo.userId",
        },
    });
    pipeline.push({
        $unwind: {
            path: "$assignedTo.userId",
            preserveNullAndEmptyArrays: true,
        },
    });

    // Earning (Virtual) imitation
    pipeline.push({
        $lookup: {
            from: "earnings",
            localField: "_id",
            foreignField: "orderId",
            as: "earning",
        },
    });
    pipeline.push({
        $unwind: { path: "$earning", preserveNullAndEmptyArrays: true },
    });

    // Sort
    pipeline.push({ $sort: { createdAt: -1 } });

    // Pagination
    const skip = (page - 1) * limit;

    // Facet for total count and paginated results
    const facetPipeline = [
        {
            $facet: {
                totalPrototype: [{ $count: "total" }],
                orders: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            orderName: 1,
                            clientId: {
                                _id: 1,
                                clientId: 1,
                                name: 1,
                                email: 1,
                                currency: 1,
                                officeAddress: 1,
                                address: 1,
                            },
                            orderDate: 1,
                            deadline: 1,
                            imageQuantity: 1,
                            perImagePrice: 1,
                            totalPrice: 1,
                            services: {
                                _id: 1,
                                name: 1,
                            },
                            returnFileFormat: {
                                _id: 1,
                                name: 1,
                                extension: 1,
                            },
                            instruction: 1,
                            status: 1,
                            priority: 1,
                            assignedTo: {
                                _id: 1,
                                staffId: 1,
                                userId: {
                                    _id: 1,
                                    name: 1,
                                    email: 1,
                                },
                            },
                            notes: 1,
                            revisionCount: 1,
                            isLegacy: 1,
                            revisionInstructions: 1,
                            timeline: 1,
                            completedAt: 1,
                            deliveredAt: 1,
                            createdBy: 1,
                            earning: {
                                _id: 1,
                                status: 1,
                            },
                            createdAt: 1,
                            updatedAt: 1,
                        },
                    },
                ],
            },
        },
        {
            $project: {
                total: { $arrayElemAt: ["$totalPrototype.total", 0] },
                orders: 1,
            },
        },
    ];

    pipeline.push(...facetPipeline);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = await OrderModel.aggregate(pipeline);

    const total = result?.total || 0;
    const orders = result?.orders || [];

    // Transform/Project specific fields if needed to match previous populate
    // But since we did simple lookups, fields are fully populated objects now
    // We might want to project only specific fields for 'clientId' etc to match lean() + populate select
    // However, for resolving the 500 error, full objects are acceptable if not too heavy.
    // The previous populate selected specific fields:
    // clientId: 'clientId name email currency officeAddress address'
    // services: 'name'
    // returnFileFormat: 'name extension'
    // assignedTo: 'staffId userId' -> userId: 'name'
    // earning: 'status'

    // We can add a projection stage inside the facet, or map the results.
    // For simplicity and to avoid huge response, let's map in memory or refine pipeline if needed.
    // For now, let's just return what we have to ensure it works.

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
            "clientId",
            "clientId name email phone currency officeAddress address",
        )
        .populate("services", "name description")
        .populate("returnFileFormat", "name extension")
        .populate({
            path: "assignedTo",
            select: "staffId userId",
            populate: {
                path: "userId",
                select: "name email",
            },
        })
        .populate("earning", "status")
        .lean();

    if (order && order.createdBy) {
        // Manually fetch createdBy user since it's a native collection
        const { default: UserModel } = await import("../models/user.model.js");
        const user = await UserModel.findOne(
            { _id: new mongoose.Types.ObjectId(order.createdBy.toString()) },
            { projection: { name: 1, email: 1 } },
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
    data: UpdateOrderData,
): Promise<IOrder | null> {
    // Handle status changes
    if (data.status === "completed" && !data.completedAt) {
        data.completedAt = new Date();
    }
    if (data.status === "delivered" && !data.deliveredAt) {
        data.deliveredAt = new Date();
    }

    const order = await OrderModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    })
        .populate(
            "clientId",
            "clientId name email currency officeAddress address",
        )
        .populate("services", "name")
        .populate("returnFileFormat", "name extension")
        .populate({
            path: "assignedTo",
            select: "staffId userId",
            populate: {
                path: "userId",
                select: "name",
            },
        })
        .lean();

    // Update monthly earning if order amount, imageQty or date changes
    if (
        order &&
        (data.totalPrice !== undefined ||
            data.imageQuantity !== undefined ||
            data.orderDate)
    ) {
        try {
            // Get the old order data to calculate differences
            const oldOrder = await OrderModel.findById(id).lean();
            if (oldOrder) {
                const updateData: {
                    orderAmount?: number;
                    imageQty?: number;
                    orderDate?: Date;
                    oldOrderAmount?: number;
                    oldImageQty?: number;
                    oldOrderDate?: Date;
                } = {};

                if (data.totalPrice !== undefined) {
                    updateData.orderAmount = data.totalPrice;
                    updateData.oldOrderAmount = oldOrder.totalPrice;
                }
                if (data.imageQuantity !== undefined) {
                    updateData.imageQty = data.imageQuantity;
                    updateData.oldImageQty = oldOrder.imageQuantity;
                }
                if (data.orderDate !== undefined) {
                    updateData.orderDate = data.orderDate;
                    updateData.oldOrderDate = oldOrder.orderDate;
                }

                await earningService.updateEarningForOrder(id, updateData);
            }
        } catch (err) {
            console.error("Error updating earning for order:", err);
        }
    }

    return order;
}

async function deleteOrderFromDB(id: string): Promise<IOrder | null> {
    // Get order data before deletion to update earning
    const order = await OrderModel.findById(id).lean();

    // Remove from monthly earning
    if (order) {
        try {
            await earningService.deleteEarningForOrder(
                id,
                order.totalPrice,
                order.imageQuantity,
            );
        } catch (err) {
            console.error("Error removing order from earning:", err);
        }
    }

    return OrderModel.findByIdAndDelete(id).lean();
}

// Update status with timeline tracking
async function updateOrderStatusWithTimeline(
    id: string,
    status: OrderStatus,
    changedBy: string,
    note?: string,
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

    if (status === "completed") {
        updateData.completedAt = new Date();
    }
    if (status === "delivered") {
        updateData.deliveredAt = new Date();
    }
    if (status === "revision") {
        updateData.$inc = { revisionCount: 1 };
    }

    return OrderModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate(
            "clientId",
            "clientId name email currency officeAddress address",
        )
        .populate("services", "name")
        .populate("returnFileFormat", "name extension")
        .populate({
            path: "assignedTo",
            select: "staffId userId",
            populate: {
                path: "userId",
                select: "name",
            },
        })
        .lean();
}

// Extend deadline
async function extendDeadline(
    id: string,
    newDeadline: Date,
    reason: string,
    changedBy: string,
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
            "clientId",
            "clientId name email currency officeAddress address",
        )
        .populate("services", "name")
        .populate("returnFileFormat", "name extension")
        .lean();
}

// Add revision instruction
async function addRevision(
    id: string,
    instruction: string,
    createdBy: string,
): Promise<IOrder | null> {
    const updateData = {
        status: "revision" as OrderStatus,
        $inc: { revisionCount: 1 },
        $push: {
            revisionInstructions: {
                instruction,
                createdAt: new Date(),
                createdBy,
            },
            timeline: {
                status: "revision" as OrderStatus,
                timestamp: new Date(),
                changedBy: createdBy,
                note: "Revision requested",
            },
        },
    };

    return OrderModel.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    })
        .populate(
            "clientId",
            "clientId name email currency officeAddress address",
        )
        .populate("services", "name")
        .populate("returnFileFormat", "name extension")
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
        OrderModel.countDocuments({ status: "pending" }),
        OrderModel.countDocuments({ status: "in_progress" }),
        OrderModel.countDocuments({ status: "quality_check" }),
        OrderModel.countDocuments({ status: "revision" }),
        OrderModel.countDocuments({ status: "completed" }),
        OrderModel.countDocuments({ status: "delivered" }),
        OrderModel.countDocuments({
            deadline: { $lt: now },
            status: { $nin: ["completed", "delivered", "cancelled"] },
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
    limit: number = 10,
): Promise<IOrder[]> {
    return OrderModel.find({ clientId })
        .populate("services", "name")
        .populate("returnFileFormat", "name extension")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean() as Promise<IOrder[]>;
}

// Get distinct years from orders
async function getOrderYearsFromDB(): Promise<number[]> {
    const result = await OrderModel.aggregate([
        {
            $group: {
                _id: { $year: "$orderDate" },
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
