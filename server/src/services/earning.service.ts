import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
} from 'date-fns';
import { Types, type HydratedDocument } from 'mongoose';
import EarningModel from '../models/earning.model.js';
import ClientModel from '../models/client.model.js';
import OrderModel from '../models/order.model.js';
import type {
    IEarning,
    IEarningPopulated,
    CreateEarningForOrderData,
    WithdrawEarningData,
    EarningQueryParams,
    EarningStatsResult,
    ClientOrdersForWithdraw,
    ImportLegacyEarningData,
} from '../types/earning.type.js';
// date-fns imports removed - no longer needed for monthly aggregation

// Create or update monthly earning when order is created
async function createEarningForOrder(
    data: CreateEarningForOrderData,
): Promise<HydratedDocument<IEarning>> {
    const orderDate = new Date(data.orderDate);
    const month = orderDate.getMonth() + 1; // 1-12
    const year = orderDate.getFullYear();

    // Try to find existing monthly earning for this client
    const existingEarning = await EarningModel.findOne({
        clientId: data.clientId,
        month,
        year,
    });

    if (existingEarning) {
        // Update existing monthly earning
        existingEarning.orderIds.push(data.orderId as any);
        existingEarning.totalAmount += data.orderAmount;
        existingEarning.imageQty += data.imageQty;
        existingEarning.netAmount =
            existingEarning.totalAmount -
            existingEarning.fees -
            existingEarning.tax;
        return existingEarning.save();
    }

    // Create new monthly earning
    const earning = new EarningModel({
        clientId: data.clientId,
        month,
        year,
        orderIds: [data.orderId],
        imageQty: data.imageQty,
        totalAmount: data.orderAmount,
        currency: data.currency,
        fees: 0,
        tax: 0,
        conversionRate: 1,
        netAmount: data.orderAmount,
        amountInBDT: 0,
        status: 'unpaid',
        isLegacy: false,
        createdBy: data.createdBy,
    });

    return earning.save();
}

// Update earning when order is updated
async function updateEarningForOrder(
    orderId: string,
    data: {
        orderAmount?: number;
        imageQty?: number;
        orderDate?: Date;
        oldOrderAmount?: number;
        oldImageQty?: number;
        oldOrderDate?: Date;
    },
): Promise<IEarning | null> {
    // If order date changed, we need to move the order to a different monthly earning
    if (data.orderDate && data.oldOrderDate) {
        const oldDate = new Date(data.oldOrderDate);
        const newDate = new Date(data.orderDate);
        const oldMonth = oldDate.getMonth() + 1;
        const oldYear = oldDate.getFullYear();
        const newMonth = newDate.getMonth() + 1;
        const newYear = newDate.getFullYear();

        if (oldMonth !== newMonth || oldYear !== newYear) {
            // Remove from old monthly earning
            const oldEarning = await EarningModel.findOne({
                orderIds: orderId,
            });

            if (oldEarning) {
                oldEarning.orderIds = oldEarning.orderIds.filter(
                    (id) => id.toString() !== orderId,
                );
                oldEarning.totalAmount -= data.oldOrderAmount || 0;
                oldEarning.imageQty -= data.oldImageQty || 0;
                oldEarning.netAmount =
                    oldEarning.totalAmount - oldEarning.fees - oldEarning.tax;

                if (oldEarning.orderIds.length === 0) {
                    await EarningModel.deleteOne({ _id: oldEarning._id });
                } else {
                    await oldEarning.save();
                }
            }

            // Add to new monthly earning - get order details
            const order =
                await OrderModel.findById(orderId).populate('clientId');
            if (order) {
                // @ts-ignore
                const currency = order.clientId?.currency || 'USD';
                return createEarningForOrder({
                    orderId,
                    clientId: order.clientId._id.toString(),
                    orderDate: newDate,
                    orderAmount: data.orderAmount || order.totalPrice,
                    imageQty: data.imageQty || order.imageQuantity,
                    currency,
                    createdBy: order.createdBy.toString(),
                }) as any;
            }
        }
    }

    // Just update the amounts in the same monthly earning
    const earning = await EarningModel.findOne({ orderIds: orderId });
    if (!earning) return null;

    if (data.orderAmount !== undefined && data.oldOrderAmount !== undefined) {
        const amountDiff = data.orderAmount - data.oldOrderAmount;
        earning.totalAmount += amountDiff;
        earning.netAmount = earning.totalAmount - earning.fees - earning.tax;
    }

    if (data.imageQty !== undefined && data.oldImageQty !== undefined) {
        const imageQtyDiff = data.imageQty - data.oldImageQty;
        earning.imageQty += imageQtyDiff;
    }

    return earning.save();
}

// Delete earning entry when order is deleted
async function deleteEarningForOrder(
    orderId: string,
    orderAmount: number,
    imageQty: number,
): Promise<IEarning | null> {
    const earning = await EarningModel.findOne({ orderIds: orderId });
    if (!earning) return null;

    // Remove order from array
    earning.orderIds = earning.orderIds.filter(
        (id) => id.toString() !== orderId,
    );
    earning.totalAmount -= orderAmount;
    earning.imageQty -= imageQty;
    earning.netAmount = earning.totalAmount - earning.fees - earning.tax;

    // If no more orders, delete the earning record
    if (earning.orderIds.length === 0 && !earning.isLegacy) {
        await EarningModel.deleteOne({ _id: earning._id });
        return earning;
    }

    return earning.save();
}

// Withdraw earning (mark as paid)
async function withdrawEarning(
    earningId: string,
    data: WithdrawEarningData,
): Promise<IEarning | null> {
    const earning = await EarningModel.findById(earningId);
    if (!earning) return null;

    const fees = data.fees ?? 0;
    const tax = data.tax ?? 0;
    const amountToApply = data.amount ?? earning.totalAmount - earning.paidAmount;
    
    // Net amount for THIS payment
    const netAmountThisPayment = amountToApply - fees - tax;
    const amountInBDTThisPayment = netAmountThisPayment * data.conversionRate;

    const paymentRecord = {
        invoiceNumber: data.invoiceNumber || `MANUAL-${new Date().getTime()}`,
        amount: amountToApply,
        amountInBDT: amountInBDTThisPayment,
        method: data.method || 'Manual',
        transactionId: data.transactionId || `MAN-TXN-${new Date().getTime()}`,
        paidAt: new Date(),
        conversionRate: data.conversionRate,
    };

    // Use atomic update to avoid race conditions
    const updatedEarning = await EarningModel.findByIdAndUpdate(
        earningId,
        {
            $inc: {
                paidAmount: amountToApply,
                paidAmountBDT: amountInBDTThisPayment,
                fees: fees,
                tax: tax,
            },
            $push: {
                payments: paymentRecord,
            },
            $set: {
                paidBy: new Types.ObjectId(data.paidBy),
            },
        },
        { new: true },
    );

    if (!updatedEarning) return null;

    // Sync amountInBDT with paidAmountBDT for display consistency
    updatedEarning.amountInBDT = updatedEarning.paidAmountBDT;
    await updatedEarning.save();

    // Check if fully paid to update status and paidAt
    if (updatedEarning.paidAmount >= updatedEarning.totalAmount - 0.01) { // tiny margin for float precision
        updatedEarning.status = 'paid';
        updatedEarning.paidAt = new Date();
        await updatedEarning.save();

        // Sync ALL linked orders if month is fully paid
        if (updatedEarning.orderIds.length > 0) {
            const OrderModel = (await import('../models/order.model.js')).default;
            await OrderModel.updateMany(
                { _id: { $in: updatedEarning.orderIds } },
                { $set: { isPaid: true } },
            );
        }

    } else if (data.invoiceNumber) {
        // If PARTIAL payment but linked to an invoice, mark THAT invoice's orders as paid
        try {
            const { InvoiceRecord } = await import('../models/invoice-record.model.js');
            const invoice = await InvoiceRecord.findOne({ invoiceNumber: data.invoiceNumber });
            if (invoice && invoice.orderIds && invoice.orderIds.length > 0) {
                const OrderModel = (await import('../models/order.model.js')).default;
                await OrderModel.updateMany(
                    { _id: { $in: invoice.orderIds } },
                    { $set: { isPaid: true } }
                );
                console.log(`[Withdraw] Partial payment: Marked ${invoice.orderIds.length} orders from invoice ${data.invoiceNumber} as PAID`);
            }
        } catch (err) {
            console.error('[Withdraw] Failed to sync orders for invoice:', err);
        }
    }

    // Trigger commission processing for EVERY BDT-converted payment
    try {
        const { default: commissionService } = await import('./commission.service.js');
        await commissionService.processEarningCommission(
            updatedEarning._id.toString(),
            data.paidBy,
        );
    } catch (commissionError) {
        console.error('[Withdraw] Failed to process commission:', commissionError);
    }

    return updatedEarning.populate('clientId', 'clientId name email currency');
}

// Toggle earning status (paid <-> unpaid)
async function toggleEarningStatus(
    earningId: string,
    newStatus: 'paid' | 'unpaid',
    data?: WithdrawEarningData,
): Promise<IEarning | null> {
    const earning = await EarningModel.findById(earningId);
    if (!earning) return null;

    if (newStatus === 'paid' && data) {
        return withdrawEarning(earningId, data);
    } else if (newStatus === 'unpaid') {
        // Reset withdrawal data
        return EarningModel.findByIdAndUpdate(
            earningId,
            {
                $set: {
                    fees: 0,
                    tax: 0,
                    conversionRate: 1,
                    netAmount: earning.totalAmount, // netAmount remains legacy total until paid
                    amountInBDT: 0,
                    status: 'unpaid',
                    paidAmount: 0,
                    paidAmountBDT: 0,
                    payments: [],
                },
                $unset: {
                    paidAt: 1,
                    paidBy: 1,
                },
            },
            { new: true },
        )
            .populate('clientId', 'clientId name email currency')
            .lean()
            .then(async (result: any) => {
                if (result && result.orderIds && result.orderIds.length > 0) {
                    const OrderModel = (await import('../models/order.model.js')).default;
                    await OrderModel.updateMany(
                        { _id: { $in: result.orderIds } },
                        { $set: { isPaid: false } }
                    );
                }
                return result;
            }) as Promise<IEarning | null>;
    }

    return null;
}

// Build date filter based on filterType
async function buildDateFilter(
    params: EarningQueryParams,
): Promise<Record<string, unknown>> {
    const filter: Record<string, unknown> = {};
    const now = new Date();

    switch (params.filterType) {
        case 'today': {
            const start = startOfDay(now);
            const end = endOfDay(now);
            const query: any = { orderDate: { $gte: start, $lte: end } };
            if (params.clientId) query.clientId = params.clientId;
            if (params.clientIds) query.clientId = { $in: params.clientIds };

            const orderIds = await OrderModel.find(query).distinct('_id');
            filter.orderIds = { $in: orderIds };
            break;
        }
        case 'week': {
            const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
            const end = endOfWeek(now, { weekStartsOn: 1 });
            const query: any = { orderDate: { $gte: start, $lte: end } };
            if (params.clientId) query.clientId = params.clientId;
            if (params.clientIds) query.clientId = { $in: params.clientIds };

            const orderIds = await OrderModel.find(query).distinct('_id');
            filter.orderIds = { $in: orderIds };
            break;
        }
        case 'month':
            if (params.month && params.year) {
                filter.month = params.month;
                filter.year = params.year;
            } else {
                filter.month = now.getMonth() + 1;
                filter.year = now.getFullYear();
            }
            break;
        case 'year':
            if (params.year) {
                filter.year = params.year;
            } else {
                filter.year = now.getFullYear();
            }
            break;
    }

    return filter;
}

// Get earnings with date filter
async function getEarningsWithDateFilter(params: EarningQueryParams): Promise<{
    earnings: IEarningPopulated[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const { page = 1, limit = 20, clientId, status } = params;
    const skip = (page - 1) * limit;
    const now = new Date();

    // For today and week, we aggregate orders to show period-accurate data
    if (params.filterType === 'today' || params.filterType === 'week') {
        const orderMatch: Record<string, any> = {};
        if (params.filterType === 'today') {
            orderMatch.orderDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
        } else {
            orderMatch.orderDate = {
                $gte: startOfWeek(now, { weekStartsOn: 1 }),
                $lte: endOfWeek(now, { weekStartsOn: 1 }),
            };
        }

        if (clientId) orderMatch.clientId = new Types.ObjectId(clientId);
        if (params.clientIds) {
            orderMatch.clientId = {
                $in: params.clientIds.map((id) => new Types.ObjectId(id)),
            };
        }

        // Add status filter if provided
        // Since status is on Earning, we'll need to join later and filter
        const pipeline: any[] = [{ $match: orderMatch }];

        pipeline.push(
            {
                $group: {
                    _id: '$clientId',
                    orderIds: { $push: '$_id' },
                    imageQty: { $sum: '$imageQuantity' },
                    totalAmount: { $sum: '$totalPrice' },
                },
            },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'client',
                },
            },
            { $unwind: '$client' },
            {
                $lookup: {
                    from: 'earnings',
                    let: { clientId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$clientId', '$$clientId'] },
                                        { $eq: ['$month', now.getMonth() + 1] },
                                        { $eq: ['$year', now.getFullYear()] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'earningRecord',
                },
            },
            {
                $unwind: {
                    path: '$earningRecord',
                    preserveNullAndEmptyArrays: true,
                },
            },
        );

        // Filter by status if provided
        if (status) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'earningRecord.status': status },
                        // If no earning record yet, we treat as 'unpaid'
                        ...(status === 'unpaid'
                            ? [{ earningRecord: { $exists: false } }]
                            : []),
                    ],
                },
            });
        }

        const totalResults = await OrderModel.aggregate([
            ...pipeline,
            { $count: 'count' },
        ]);
        const total = totalResults[0]?.count || 0;

        const results = await OrderModel.aggregate([
            ...pipeline,
            { $sort: { totalAmount: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: {
                        $ifNull: [
                            '$earningRecord._id',
                            { $toString: '$_id' }, // Fallback ID for display
                        ],
                    },
                    clientId: {
                        _id: '$client._id',
                        clientId: '$client.clientId',
                        name: '$client.name',
                        emails: '$client.emails',
                        currency: '$client.currency',
                    },
                    month: { $literal: now.getMonth() + 1 },
                    year: { $literal: now.getFullYear() },
                    orderIds: '$orderIds',
                    imageQty: '$imageQty',
                    totalAmount: '$totalAmount',
                    paidAmount: {
                        $cond: [
                            { $and: [
                                { $eq: [{ $ifNull: ['$earningRecord.status', 'unpaid'] }, 'paid'] },
                                { $eq: [{ $ifNull: ['$earningRecord.paidAmount', 0] }, 0] }
                            ]},
                            '$totalAmount',
                            { $ifNull: ['$earningRecord.paidAmount', 0] }
                        ]
                    },
                    paidAmountBDT: {
                        $cond: [
                            { $and: [
                                { $eq: [{ $ifNull: ['$earningRecord.status', 'unpaid'] }, 'paid'] },
                                { $eq: [{ $ifNull: ['$earningRecord.paidAmountBDT', 0] }, 0] }
                            ]},
                            { $multiply: ['$totalAmount', { $ifNull: ['$earningRecord.conversionRate', 120] }] },
                            { $ifNull: ['$earningRecord.paidAmountBDT', 0] }
                        ]
                    },
                    payments: { $ifNull: ['$earningRecord.payments', []] },
                    currency: { $ifNull: ['$client.currency', 'USD'] },
                    fees: { $ifNull: ['$earningRecord.fees', 0] },
                    tax: { $ifNull: ['$earningRecord.tax', 0] },
                    conversionRate: {
                        $ifNull: ['$earningRecord.conversionRate', 120],
                    },
                    netAmount: '$totalAmount', // For period view, net matches total unless withdrawn
                    amountInBDT: {
                        $cond: [
                            { $and: [
                                { $eq: [{ $ifNull: ['$earningRecord.status', 'unpaid'] }, 'paid'] },
                                { $eq: [{ $ifNull: ['$earningRecord.paidAmountBDT', 0] }, 0] }
                            ]},
                            { $multiply: ['$totalAmount', { $ifNull: ['$earningRecord.conversionRate', 120] }] },
                            { $ifNull: ['$earningRecord.paidAmountBDT', 0] }
                        ]
                    },
                    status: { $ifNull: ['$earningRecord.status', 'unpaid'] },
                    createdAt: {
                        $ifNull: ['$earningRecord.createdAt', new Date()],
                    },
                },
            },
        ]);

        return {
            earnings: results as any,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Default monthly Record lookup for month/year filters
    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = clientId;
    if (params.clientIds) filter.clientId = { $in: params.clientIds };
    if (status) filter.status = status;

    const dateFilter = await buildDateFilter(params);
    Object.assign(filter, dateFilter);

    const [earnings, total] = await Promise.all([
        EarningModel.find(filter)
            .populate('clientId', 'clientId name email currency')
            .sort({ year: -1, month: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .then((docs) =>
                docs.map((doc) => ({
                    ...doc,
                    amountInBDT: doc.amountInBDT || doc.paidAmountBDT || 0,
                })),
            ),
        EarningModel.countDocuments(filter),
    ]);

    return {
        earnings: earnings as unknown as IEarningPopulated[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

// Get earning by ID
async function getEarningByIdFromDB(
    id: string,
): Promise<IEarningPopulated | null> {
    return EarningModel.findById(id)
        .populate('clientId', 'clientId name email currency')
        .populate(
            'orderIds',
            'orderName totalPrice imageQuantity status orderDate',
        )
        .lean() as Promise<IEarningPopulated | null>;
}

// Get stats with optional date filter
async function getEarningStatsWithFilter(
    params: EarningQueryParams,
): Promise<EarningStatsResult> {
    const now = new Date();
    let periodPaid = { count: 0, totalAmount: 0, totalBDT: 0, paidAmount: 0 };
    let periodUnpaid = { count: 0, totalAmount: 0, totalBDT: 0, paidAmount: 0 };

    // 1. Determine period stats (today/week/month/year)
    if (params.filterType === 'today' || params.filterType === 'week') {
        const orderMatch: Record<string, any> = {};
        if (params.filterType === 'today') {
            orderMatch.orderDate = {
                $gte: startOfDay(now),
                $lte: endOfDay(now),
            };
        } else {
            orderMatch.orderDate = {
                $gte: startOfWeek(now, { weekStartsOn: 1 }),
                $lte: endOfWeek(now, { weekStartsOn: 1 }),
            };
        }

        if (params.clientId)
            orderMatch.clientId = new Types.ObjectId(params.clientId);
        if (params.clientIds) {
            orderMatch.clientId = {
                $in: params.clientIds.map((id) => new Types.ObjectId(id)),
            };
        }

        const periodStats = await OrderModel.aggregate([
            { $match: orderMatch },
            {
                $lookup: {
                    from: 'earnings',
                    localField: '_id',
                    foreignField: 'orderIds',
                    as: 'earning',
                },
            },
            { $unwind: { path: '$earning', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$earning.status', 'unpaid'] },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalPrice' },
                    paidAmount: { $sum: { $ifNull: ['$earning.paidAmount', 0] } },
                    totalBDT: { $sum: { $ifNull: ['$earning.paidAmountBDT', 0] } },
                },
            },
        ]);

        const unpaid = periodStats.find((s) => s._id === 'unpaid');
        const paid = periodStats.find((s) => s._id === 'paid');
        if (unpaid) periodUnpaid = unpaid;
        if (paid) periodPaid = paid;
    } else if (params.filterType === 'month' || params.filterType === 'year') {
        const earningMatch: Record<string, any> = {};
        if (params.filterType === 'month') {
            earningMatch.month = params.month || now.getMonth() + 1;
            earningMatch.year = params.year || now.getFullYear();
        } else {
            earningMatch.year = params.year || now.getFullYear();
        }

        if (params.clientId)
            earningMatch.clientId = new Types.ObjectId(params.clientId);
        if (params.clientIds) {
            earningMatch.clientId = {
                $in: params.clientIds.map((id) => new Types.ObjectId(id)),
            };
        }

        const periodStats = await EarningModel.aggregate([
            { $match: earningMatch },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                    paidAmount: { $sum: '$paidAmount' },
                    totalBDT: { $sum: '$paidAmountBDT' },
                },
            },
        ]);

        const unpaid = periodStats.find((s) => s._id === 'unpaid');
        const paid = periodStats.find((s) => s._id === 'paid');
        if (unpaid) periodUnpaid = unpaid;
        if (paid) periodPaid = paid;
    }

    // 2. Get total (all-time) stats as baseline
    const totalMatch: Record<string, any> = {};
    if (params.clientId)
        totalMatch.clientId = new Types.ObjectId(params.clientId);
    if (params.clientIds) {
        totalMatch.clientId = {
            $in: params.clientIds.map((id) => new Types.ObjectId(id)),
        };
    }

    const totalStats = await EarningModel.aggregate([
        ...(Object.keys(totalMatch).length > 0 ? [{ $match: totalMatch }] : []),
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' },
                paidAmount: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ['$status', 'paid'] }, { $eq: [{ $ifNull: ['$paidAmount', 0] }, 0] }] },
                            '$totalAmount',
                            { $ifNull: ['$paidAmount', 0] }
                        ]
                    },
                },
                paidAmountBDT: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ['$status', 'paid'] }, { $eq: [{ $ifNull: ['$paidAmountBDT', 0] }, 0] }] },
                            { $multiply: ['$totalAmount', { $ifNull: ['$conversionRate', 120] }] },
                            { $ifNull: ['$paidAmountBDT', 0] }
                        ]
                    },
                },
                unpaidCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] },
                },
                paidCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
                },
            },
        },
    ]);

    const stats = totalStats[0] || {
        totalAmount: 0,
        paidAmount: 0,
        paidAmountBDT: 0,
        unpaidCount: 0,
        paidCount: 0,
    };

    return {
        totalUnpaidCount: stats.unpaidCount,
        totalUnpaidAmount: stats.totalAmount - stats.paidAmount,
        totalPaidCount: stats.paidCount,
        totalPaidAmount: stats.paidAmount,
        totalPaidBDT: stats.paidAmountBDT,

        filteredUnpaidCount: periodUnpaid.count,
        filteredUnpaidAmount: periodUnpaid.totalAmount - (periodUnpaid.paidAmount || 0),
        filteredPaidCount: periodPaid.count,
        filteredPaidAmount: periodPaid.paidAmount || 0,
        filteredPaidBDT: periodPaid.totalBDT || 0,
    };
}

// Get client's unpaid earning for bulk withdraw
async function getClientOrdersForBulkWithdraw(
    clientId: string,
    month: number,
    year: number,
): Promise<ClientOrdersForWithdraw | null> {
    const earning = await EarningModel.findOne({
        clientId,
        month,
        year,
        status: 'unpaid',
    })
        .populate('clientId', 'clientId name email currency')
        .lean();

    if (!earning) return null;

    const clientData = earning.clientId as unknown as
        | {
              _id: string;
              clientId: string;
              name: string;
              currency?: string;
          }
        | undefined;

    if (!clientData) return null;

    return {
        clientId: clientData._id,
        clientName: clientData.name,
        clientCode: clientData.clientId,
        currency: clientData.currency || 'USD',
        earningId: earning._id.toString(),
        month: earning.month,
        year: earning.year,
        orderCount: earning.orderIds.length,
        imageQty: earning.imageQty,
        totalAmount: earning.totalAmount,
    };
}

// Delete earning by ID
async function deleteEarningFromDB(id: string): Promise<IEarning | null> {
    return EarningModel.findByIdAndDelete(id).lean();
}

// Get unique years from earnings for filter dropdown
async function getEarningYearsFromDB(): Promise<number[]> {
    const result = await EarningModel.aggregate([
        {
            $group: {
                _id: '$year',
            },
        },
        {
            $sort: { _id: -1 },
        },
    ]);

    return result.map((r) => r._id).filter((y) => y !== null);
}

// Get clients who have unpaid earnings for a specific month/year
async function getClientsWithUnpaidEarnings(
    month: number,
    year: number,
): Promise<any[]> {
    const clientIds = await EarningModel.distinct('clientId', {
        status: 'unpaid',
        month,
        year,
    });

    if (clientIds.length === 0) return [];

    return ClientModel.find({ _id: { $in: clientIds } })
        .select('name clientId currency')
        .lean();
}

// Import legacy earning (for old data without orderIds)
async function importLegacyEarning(
    data: ImportLegacyEarningData,
): Promise<HydratedDocument<IEarning>> {
    const earning = new EarningModel({
        clientId: data.clientId,
        month: data.month,
        year: data.year,
        orderIds: [], // Empty for legacy
        imageQty: data.imageQty,
        totalAmount: data.totalAmount,
        currency: data.currency,
        fees: 0,
        tax: 0,
        conversionRate: data.conversionRate,
        netAmount: data.totalAmount,
        amountInBDT: data.amountInBDT,
        status: data.status,
        isLegacy: true,
        legacyClientCode: data.legacyClientCode,
        createdBy: data.createdBy,
    });

    return earning.save();
}

// Update earning manually (e.g. changing client)
async function updateEarning(
    id: string,
    updates: Partial<IEarning>,
): Promise<IEarning | null> {
    // If clientId is being updated, check for duplicates
    if (updates.clientId) {
        const earning = await EarningModel.findById(id);
        if (!earning) return null;

        // Check if clientId actually changed
        if (earning.clientId.toString() !== updates.clientId.toString()) {
            const duplicate = await EarningModel.findOne({
                clientId: updates.clientId,
                month: updates.month || earning.month,
                year: updates.year || earning.year,
                _id: { $ne: id },
            });

            if (duplicate) {
                throw new Error(
                    'An earning record already exists for this client in this month/year.',
                );
            }
        }
    }

    return EarningModel.findByIdAndUpdate(id, { $set: updates }, { new: true })
        .populate('clientId', 'clientId name email currency')
        .lean() as Promise<IEarning | null>;
}

// Sync earning data with actual orders
async function syncEarningFromOrders(id: string): Promise<IEarning | null> {
    const earning = await EarningModel.findById(id);
    if (!earning || earning.isLegacy) return earning;

    const OrderModel = (await import('../models/order.model.js')).default;

    // Find all orders for this client in the same month/year
    const orders = await OrderModel.find({
        clientId: earning.clientId,
        $expr: {
            $and: [
                { $eq: [{ $month: '$orderDate' }, earning.month] },
                { $eq: [{ $year: '$orderDate' }, earning.year] },
            ],
        },
        status: { $ne: 'cancelled' },
    });

    const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const imageQty = orders.reduce((sum, o) => sum + o.imageQuantity, 0);
    const orderIds = orders.map((o) => o._id);

    earning.totalAmount = totalAmount;
    earning.imageQty = imageQty;
    earning.orderIds = orderIds as any;
    earning.netAmount = totalAmount - earning.fees - earning.tax;

    // Correct the status if paidAmount doesn't match totalAmount
    if (earning.paidAmount < earning.totalAmount - 0.01) {
        earning.status = 'unpaid';
    } else {
        earning.status = 'paid';
    }

    const saved = await earning.save();
    return saved.populate('clientId', 'clientId name email currency');
}

export default {
    createEarningForOrder,
    updateEarningForOrder,
    deleteEarningForOrder,
    withdrawEarning,
    toggleEarningStatus,
    getEarningsWithDateFilter,
    getEarningByIdFromDB,
    getEarningStatsWithFilter,
    getClientOrdersForBulkWithdraw,
    getClientsWithUnpaidEarnings,
    deleteEarningFromDB,
    getEarningYearsFromDB,
    importLegacyEarning,
    updateEarning,
    syncEarningFromOrders,
};
