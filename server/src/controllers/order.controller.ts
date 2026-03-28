import type { Request, Response } from 'express';
import orderService from '../services/order.service.js';
import emailService from '../services/email.service.js';
import { isTelemarketer } from '../utils/telemarketer.util.js';
import type { OrderStatus, OrderPriority } from '../types/order.type.js';
import { Role } from '../constants/role.js';
import mongoose from 'mongoose';
import ClientModel from '../models/client.model.js';

async function createOrder(req: Request, res: Response) {
    try {
        const {
            orderName,
            clientId,
            orderDate,
            deadline,
            imageQuantity,
            perImagePrice,
            totalPrice,
            services,
            returnFileFormat,
            instruction,
            priority,
            assignedTo,
            notes,
        } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Ownership enforcement for telemarketers: can only create orders for their own clients
        if (
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const client = await ClientModel.findById(clientId).lean();
                if (!client || client.createdBy?.toString() !== userId) {
                    return res.status(403).json({
                        message:
                            'Forbidden: You can only create orders for your own clients',
                    });
                }
            }
        }

        // Build order data, filtering out empty strings for optional ObjectId fields
        const orderData: Record<string, unknown> = {
            orderName,
            clientId,
            orderDate: new Date(orderDate),
            deadline: new Date(deadline),
            imageQuantity,
            perImagePrice,
            totalPrice,
            services,
            returnFileFormat,
            createdBy: userId,
        };

        // Only include optional fields if they have valid values
        if (instruction) orderData.instruction = instruction;
        if (priority) orderData.priority = priority;
        if (assignedTo && assignedTo.trim() !== '')
            orderData.assignedTo = assignedTo;
        if (notes) orderData.notes = notes;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const order = await orderService.createOrderInDB(orderData as any);

        return res.status(201).json({
            message: 'Order created successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error creating order:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        return res
            .status(500)
            .json({ message: 'Internal server error', error: errorMessage });
    }
}

async function getAllOrders(req: Request, res: Response) {
    try {
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
            page,
            limit,
        } = req.query;
        const userId = req.user?.id;

        // Build filters object conditionally to avoid undefined values
        const filters: {
            clientId?: string;
            clientIds?: string[];
            status?: OrderStatus;
            priority?: OrderPriority;
            assignedTo?: string;
            startDate?: string;
            endDate?: string;
            month?: number;
            year?: number;
            search?: string;
            page: number;
            limit: number;
            createdBy?: string;
        } = {
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        };

        if (clientId) filters.clientId = clientId as string;
        if (status) filters.status = status as OrderStatus;
        if (priority) filters.priority = priority as OrderPriority;
        if (assignedTo) filters.assignedTo = assignedTo as string;
        if (startDate) filters.startDate = startDate as string;
        if (endDate) filters.endDate = endDate as string;
        if (month) filters.month = parseInt(month as string);
        if (year) filters.year = parseInt(year as string);
        if (search) filters.search = (search as string).trim();

        // Ownership filtering: Telemarketers only see orders of their own added clients
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const myClients = await ClientModel.find({ createdBy: userId })
                    .select('_id')
                    .lean();
                const myClientIds = myClients.map((c) => c._id.toString());
                filters.clientIds = myClientIds;
            }
        }

        const result = await orderService.getAllOrdersFromDB(filters);

        return res.status(200).json({
            message: 'Orders retrieved successfully',
            data: result.orders,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting orders:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getOrderById(req: Request, res: Response) {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        const order = await orderService.getOrderByIdFromDB(id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ownership enforcement for telemarketers
        const userId = req.user?.id;
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const clientOwnerId = (
                    order.clientId as any
                )?.createdBy?.toString();
                if (clientOwnerId !== userId) {
                    return res.status(403).json({
                        message:
                            'Forbidden: You do not have permission to view this order',
                    });
                }
            }
        }

        return res.status(200).json({
            message: 'Order retrieved successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error getting order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateOrder(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const {
            orderName,
            clientId,
            orderDate,
            deadline,
            imageQuantity,
            perImagePrice,
            totalPrice,
            services,
            returnFileFormat,
            instruction,
            status,
            priority,
            assignedTo,
            notes,
        } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        const existingOrder = await orderService.getOrderByIdFromDB(id);
        if (!existingOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ownership enforcement for telemarketers
        const userId = req.user?.id;
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const clientOwnerId = (
                    existingOrder.clientId as any
                )?.createdBy?.toString();
                if (clientOwnerId !== userId) {
                    return res.status(403).json({
                        message:
                            'Forbidden: You do not have permission to update this order',
                    });
                }
            }
        }

        // Build update object conditionally to avoid undefined values
        const updateData: Record<string, unknown> = {};
        if (orderName !== undefined) updateData.orderName = orderName;
        if (clientId !== undefined) updateData.clientId = clientId;
        if (orderDate !== undefined) updateData.orderDate = new Date(orderDate);
        if (deadline !== undefined) updateData.deadline = new Date(deadline);
        if (imageQuantity !== undefined)
            updateData.imageQuantity = imageQuantity;
        if (perImagePrice !== undefined)
            updateData.perImagePrice = perImagePrice;
        if (totalPrice !== undefined) updateData.totalPrice = totalPrice;
        if (services !== undefined) updateData.services = services;
        if (returnFileFormat !== undefined)
            updateData.returnFileFormat = returnFileFormat;
        if (instruction !== undefined) updateData.instruction = instruction;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        // Handle assignedTo - only include if it's a valid ObjectId, otherwise unset it
        if (assignedTo !== undefined) {
            if (assignedTo && assignedTo.trim() !== '') {
                updateData.assignedTo = assignedTo;
            } else {
                updateData.assignedTo = null; // This will unset the field
            }
        }
        if (notes !== undefined) updateData.notes = notes;

        const order = await orderService.updateOrderInDB(id, updateData);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        return res.status(200).json({
            message: 'Order updated successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteOrder(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const userId = req.user?.id;

        if (!id) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check if user is admin
        const { default: UserModel } = await import('../models/user.model.js');
        const user = await UserModel.findOne({
            _id: new mongoose.Types.ObjectId(userId),
        });

        if (!user || !['admin', 'super_admin'].includes(user.role)) {
            return res.status(403).json({
                message: 'Forbidden. Only admins can delete orders.',
            });
        }

        const order = await orderService.deleteOrderFromDB(id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        return res.status(200).json({
            message: 'Order deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Update status with timeline tracking
async function updateOrderStatus(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const { status, note, sendEmail, customEmailMessage } = req.body;
        const userId = req.user?.id;

        if (!id) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const existingOrder = await orderService.getOrderByIdFromDB(id);
        if (!existingOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ownership enforcement for telemarketers
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const clientOwnerId = (
                    existingOrder.clientId as any
                )?.createdBy?.toString();
                if (clientOwnerId !== userId) {
                    return res.status(403).json({
                        message:
                            'Forbidden: You do not have permission to update this order status',
                    });
                }
            }
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const order = await orderService.updateOrderStatusWithTimeline(
            id,
            status,
            userId,
            note,
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Send email notification if requested
        if (sendEmail && customEmailMessage) {
            try {
                const client = order.clientId as any;
                if (client?.emails?.length > 0) {
                    // Support multi-recipient: selectedEmails (array) takes priority
                    let recipients: string[] = [];

                    if (
                        Array.isArray(req.body.selectedEmails) &&
                        req.body.selectedEmails.length > 0
                    ) {
                        recipients = req.body.selectedEmails;
                    } else if (
                        typeof req.body.selectedEmail === 'string' &&
                        req.body.selectedEmail.trim() !== ''
                    ) {
                        recipients = [req.body.selectedEmail];
                    } else {
                        recipients = [client.emails[0]];
                    }

                    // Send to all selected recipients
                    for (const recipientEmail of recipients) {
                        await emailService.sendOrderStatusEmail({
                            to: recipientEmail,
                            clientName: client.name || '',
                            orderName: (order as any).orderName || '',
                            status,
                            message: customEmailMessage,
                        });
                    }
                }
            } catch (emailError) {
                console.error('Failed to send status email:', emailError);
                // Don't fail the request — order is already updated
            }
        }

        return res.status(200).json({
            message: 'Order status updated successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Extend deadline
async function extendDeadline(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const { newDeadline, reason } = req.body;
        const userId = req.user?.id;

        if (!id) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const existingOrder = await orderService.getOrderByIdFromDB(id);
        if (!existingOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ownership enforcement for telemarketers
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const clientOwnerId = (
                    existingOrder.clientId as any
                )?.createdBy?.toString();
                if (clientOwnerId !== userId) {
                    return res.status(403).json({
                        message:
                            "Forbidden: You do not have permission to extend this order's deadline",
                    });
                }
            }
        }

        if (!newDeadline) {
            return res
                .status(400)
                .json({ message: 'New deadline is required' });
        }

        const order = await orderService.extendDeadline(
            id,
            new Date(newDeadline),
            reason || 'Deadline extended',
            userId,
        );

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        return res.status(200).json({
            message: 'Deadline extended successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error extending deadline:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Add revision
async function addRevision(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const { instruction } = req.body;
        const userId = req.user?.id;

        if (!id) {
            return res.status(400).json({ message: 'Order ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const existingOrder = await orderService.getOrderByIdFromDB(id);
        if (!existingOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ownership enforcement for telemarketers
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const clientOwnerId = (
                    existingOrder.clientId as any
                )?.createdBy?.toString();
                if (clientOwnerId !== userId) {
                    return res.status(403).json({
                        message:
                            'Forbidden: You do not have permission to add revision to this order',
                    });
                }
            }
        }

        if (!instruction) {
            return res
                .status(400)
                .json({ message: 'Revision instruction is required' });
        }

        const order = await orderService.addRevision(id, instruction, userId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        return res.status(200).json({
            message: 'Revision added successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error adding revision:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getOrderStats(_req: Request, res: Response) {
    try {
        const stats = await orderService.getOrderStatsFromDB();

        return res.status(200).json({
            message: 'Order stats retrieved successfully',
            data: stats,
        });
    } catch (error) {
        console.error('Error getting order stats:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getOrdersByClient(req: Request, res: Response) {
    try {
        const clientId = req.params.clientId;
        const { limit } = req.query;

        if (!clientId) {
            return res.status(400).json({ message: 'Client ID is required' });
        }

        // Ownership enforcement for telemarketers: check if telemarketer owns the client
        const userId = req.user?.id;
        if (
            userId &&
            req.user &&
            [Role.STAFF, Role.TEAM_LEADER].includes(req.user.role as Role)
        ) {
            const isTM = await isTelemarketer(userId);
            if (isTM) {
                const { default: clientService } =
                    await import('../services/client.service.js');
                const client =
                    await clientService.getClientByIdFromDB(clientId);
                if (!client || client.createdBy?._id?.toString() !== userId) {
                    return res.status(403).json({
                        message:
                            'Forbidden: You do not have permission to view orders for this client',
                    });
                }
            }
        }

        const orders = await orderService.getOrdersByClientFromDB(
            clientId,
            limit ? parseInt(limit as string) : 10,
        );

        return res.status(200).json({
            message: 'Client orders retrieved successfully',
            data: orders,
        });
    } catch (error) {
        console.error('Error getting client orders:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getOrderYears(_req: Request, res: Response) {
    try {
        const years = await orderService.getOrderYearsFromDB();

        return res.status(200).json({
            message: 'Order years retrieved successfully',
            data: years,
        });
    } catch (error) {
        console.error('Error getting order years:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    extendDeadline,
    addRevision,
    getOrderStats,
    getOrdersByClient,
    getOrderYears,
};
