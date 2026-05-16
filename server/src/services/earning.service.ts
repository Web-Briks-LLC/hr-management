import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
} from 'date-fns';
import mongoose, { Types, type HydratedDocument, type ClientSession } from 'mongoose';
import analyticsService from './analytics.service.js';
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
    CurrencyStat,
    ClientOrdersForWithdraw,
    ImportLegacyEarningData,
} from '../types/earning.type.js';

// Helper for currency rounding
const roundAmount = (num: number): number => Math.round(num * 100) / 100;

// Create or update monthly earning when order is created
async function createEarningForOrder(
    data: CreateEarningForOrderData,
    session?: ClientSession,
): Promise<HydratedDocument<IEarning>> {
    const orderDate = new Date(data.orderDate);
    const month = orderDate.getMonth() + 1; // 1-12
    const year = orderDate.getFullYear();

    // Try to find existing monthly earning for this client
    const existingEarning = await EarningModel.findOne({
        clientId: data.clientId,
        month,
        year,
    }).session(session || null);

    if (existingEarning) {
        // Update existing monthly earning
        existingEarning.orderIds.push(data.orderId as any);
        existingEarning.totalAmount = roundAmount(existingEarning.totalAmount + data.orderAmount);
        existingEarning.imageQty += data.imageQty;
        existingEarning.netAmount = roundAmount(
            existingEarning.totalAmount -
            existingEarning.fees -
            existingEarning.tax
        );

        // Reset status if new orders make it underpaid
        if (
            existingEarning.status === 'paid' &&
            existingEarning.totalAmount > existingEarning.paidAmount + 0.005
        ) {
            existingEarning.status = 'unpaid';
        }

        return (existingEarning as any).save({ session: session || null });
    }

    // Create new monthly earning
    const earning = new EarningModel({
        clientId: data.clientId,
        month,
        year,
        orderIds: [data.orderId],
        imageQty: data.imageQty,
        totalAmount: roundAmount(data.orderAmount),
        currency: data.currency,
        fees: 0,
        tax: 0,
        conversionRate: 1,
        netAmount: roundAmount(data.orderAmount),
        amountInBDT: 0,
        status: 'unpaid',
        withdrawnAmount: 0,
        paidAmount: 0,
        paidAmountBDT: 0,
        isLegacy: false,
        createdBy: data.createdBy,
    });

    return (earning as any).save({ session: session || null });
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
    sessionParam?: ClientSession,
): Promise<IEarning | null> {
    const session = sessionParam || await mongoose.startSession();
    if (!sessionParam) session.startTransaction();

    try {
        if (data.orderDate && data.oldOrderDate) {
            const oldDate = new Date(data.oldOrderDate);
            const newDate = new Date(data.orderDate);
            const oldMonth = oldDate.getMonth() + 1;
            const oldYear = oldDate.getFullYear();
            const newMonth = newDate.getMonth() + 1;
            const newYear = newDate.getFullYear();

            if (oldMonth !== newMonth || oldYear !== newYear) {
                const oldEarning = await EarningModel.findOne({ orderIds: orderId }).session(session);
                if (oldEarning) {
                    oldEarning.orderIds = oldEarning.orderIds.filter((id) => id.toString() !== orderId);
                    oldEarning.totalAmount = roundAmount(oldEarning.totalAmount - (data.oldOrderAmount || 0));
                    oldEarning.imageQty -= data.oldImageQty || 0;
                    oldEarning.netAmount = roundAmount(oldEarning.totalAmount - oldEarning.fees - oldEarning.tax);
                    if (oldEarning.orderIds.length === 0) {
                        await EarningModel.deleteOne({ _id: oldEarning._id }).session(session);
                    } else {
                        await (oldEarning as any).save({ session });
                    }
                }
                const order = await OrderModel.findById(orderId).populate('clientId').session(session);
                if (order) {
                    const currency = (order.clientId as any)?.currency || 'USD';
                    const result = await createEarningForOrder({
                        orderId,
                        clientId: (order.clientId as any)._id.toString(),
                        orderDate: newDate,
                        orderAmount: data.orderAmount || order.totalPrice,
                        imageQty: data.imageQty || order.imageQuantity,
                        currency,
                        createdBy: order.createdBy.toString(),
                    }, session);
                    if (!sessionParam) await session.commitTransaction();
                    return result;
                }
            }
        }

        const earning = await EarningModel.findOne({ orderIds: orderId }).session(session);
        if (!earning) {
            if (!sessionParam) await session.commitTransaction();
            return null;
        }

        if (data.orderAmount !== undefined && data.oldOrderAmount !== undefined) {
            const amountDiff = data.orderAmount - data.oldOrderAmount;
            if (amountDiff < 0 && earning.status === 'paid') {
                const finalAmount = await analyticsService.getCurrentFinalAmount(session);
                if (-amountDiff > finalAmount) {
                    throw new Error("Insufficient balance. Transaction exceeds available amount.");
                }
            }
            earning.totalAmount = roundAmount(earning.totalAmount + amountDiff);
            earning.netAmount = roundAmount(earning.totalAmount - earning.fees - earning.tax);
        }
        if (data.imageQty !== undefined && data.oldImageQty !== undefined) {
            earning.imageQty += (data.imageQty - data.oldImageQty);
        }
        if (earning.status === 'paid' && earning.totalAmount > earning.paidAmount + 0.005) {
            earning.status = 'unpaid';
        }
        const result = await (earning as any).save({ session });
        if (!sessionParam) await session.commitTransaction();
        return result;
    } catch (error) {
        if (!sessionParam) await session.abortTransaction();
        throw error;
    } finally {
        if (!sessionParam) session.endSession();
    }
}

// Delete earning entry when order is deleted
async function deleteEarningForOrder(
    orderId: string,
    orderAmount: number,
    imageQty: number,
    sessionParam?: ClientSession,
): Promise<IEarning | null> {
    const session = sessionParam || await mongoose.startSession();
    if (!sessionParam) session.startTransaction();

    try {
        const earning = await EarningModel.findOne({ orderIds: orderId }).session(session);
        if (!earning) {
            if (!sessionParam) await session.commitTransaction();
            return null;
        }

        // Check balance before reducing earning
        if (earning.status === 'paid') {
            const finalAmount = await analyticsService.getCurrentFinalAmount(session);
            if (orderAmount > finalAmount) {
                throw new Error("Insufficient balance. Transaction exceeds available amount.");
            }
        }

        earning.orderIds = earning.orderIds.filter((id) => id.toString() !== orderId);
        earning.totalAmount = roundAmount(earning.totalAmount - orderAmount);
        earning.imageQty -= imageQty;
        earning.netAmount = roundAmount(earning.totalAmount - earning.fees - earning.tax);

        if (earning.orderIds.length === 0 && !earning.isLegacy) {
            await EarningModel.deleteOne({ _id: earning._id }).session(session);
            if (!sessionParam) await session.commitTransaction();
            return earning;
        }
        const result = await (earning as any).save({ session });
        if (!sessionParam) await session.commitTransaction();
        return result;
    } catch (error) {
        if (!sessionParam) await session.abortTransaction();
        throw error;
    } finally {
        if (!sessionParam) session.endSession();
    }
}

// Withdraw earning (mark as paid)
async function withdrawEarning(
    earningId: string,
    data: WithdrawEarningData,
    session?: ClientSession,
): Promise<IEarning | null> {
    const earning = await EarningModel.findById(earningId).session(session || null);
    if (!earning) return null;

    const fees = data.fees ?? 0;
    const tax = data.tax ?? 0;
    const isConversionOnly = data.isConversion || data.isGapConversion || (earning.status === 'paid' && earning.paidAmount >= earning.totalAmount && earning.paidAmountBDT === 0);
    const amountToApply = data.amount ?? (isConversionOnly ? earning.paidAmount : earning.totalAmount - earning.paidAmount);
    
    const netAmountThisPayment = Math.max(0, amountToApply - fees - tax);
    const conversionRate = data.conversionRate ?? (await (await import('./currency-rate.service.js')).default.getRateForCurrency(earning.month, earning.year, earning.currency));
    const amountInBDTThisPayment = roundAmount(netAmountThisPayment * conversionRate);

    let updatedEarning;

    if (data.paymentId) {
        updatedEarning = await EarningModel.findOneAndUpdate(
            { _id: earningId, "payments._id": data.paymentId },
            {
                $set: {
                    "payments.$.amountInBDT": amountInBDTThisPayment,
                    "payments.$.conversionRate": conversionRate,
                    "payments.$.fees": fees,
                    "payments.$.tax": tax,
                    "payments.$.paidAt": new Date(),
                    paidBy: new Types.ObjectId(data.paidBy),
                },
                $inc: {
                    paidAmountBDT: amountInBDTThisPayment,
                    fees: fees,
                    tax: tax,
                }
            },
            { new: true, session: session || null },
        );
    } else {
        const paymentRecord = {
            invoiceNumber: data.invoiceNumber || `MANUAL-${new Date().getTime()}`,
            amount: amountToApply,
            amountInBDT: amountInBDTThisPayment,
            method: data.method || 'Manual',
            transactionId: data.transactionId || `MAN-TXN-${new Date().getTime()}`,
            paidAt: new Date(),
            conversionRate: conversionRate,
            fees: fees,
            tax: tax,
        };
        const incValues: any = { paidAmountBDT: amountInBDTThisPayment, fees: fees, tax: tax };
        if (!isConversionOnly) incValues.paidAmount = amountToApply;

        updatedEarning = await EarningModel.findByIdAndUpdate(
            earningId,
            { $inc: incValues, $push: { payments: paymentRecord }, $set: { paidBy: new Types.ObjectId(data.paidBy) } },
            { new: true, session: session || null },
        );
    }

    if (!updatedEarning) return null;

    (updatedEarning as any).amountInBDT = roundAmount((updatedEarning as any).paidAmountBDT || 0);

    if ((updatedEarning as any).paidAmount >= (updatedEarning as any).totalAmount - 0.01) {
        (updatedEarning as any).status = 'paid';
        (updatedEarning as any).paidAt = new Date();
        await (updatedEarning as any).save({ session: session || null });
        if ((updatedEarning as any).orderIds.length > 0) {
            const OrderModel = (await import('../models/order.model.js')).default;
            await (OrderModel as any).updateMany(
                { _id: { $in: (updatedEarning as any).orderIds } },
                { $set: { isPaid: true } },
                { session }
            );
        }
    } else {
        await (updatedEarning as any).save({ session: session || null });
        if (data.invoiceNumber) {
            try {
                const { InvoiceRecord } = await import('../models/invoice-record.model.js');
                const invoice = await InvoiceRecord.findOne({ invoiceNumber: data.invoiceNumber }).session(session || null);
                if (invoice && invoice.orderIds && invoice.orderIds.length > 0) {
                    const OrderModel = (await import('../models/order.model.js')).default;
                    await (OrderModel as any).updateMany({ _id: { $in: invoice.orderIds } }, { $set: { isPaid: true } }, { session });
                }
            } catch (err) { console.error('[Withdraw] Failed to sync orders:', err); }
        }
    }

    try {
        const { default: commissionService } = await import('./commission.service.js');
        await commissionService.processEarningCommission((updatedEarning as any)._id.toString(), data.paidBy, session);
    } catch (err) { console.error('[Withdraw] Failed to process commission:', err); }

    return (updatedEarning as any).populate('clientId', 'clientId name email currency');
}

// Toggle earning status (paid <-> unpaid)
async function toggleEarningStatus(
    earningId: string,
    newStatus: 'paid' | 'unpaid',
    data?: WithdrawEarningData,
    session?: ClientSession,
): Promise<IEarning | null> {
    const earning = await EarningModel.findById(earningId).session(session || null);
    if (!earning) return null;

    if (newStatus === 'paid') {
        const remainingAmount = Math.max(0, earning.totalAmount - earning.paidAmount);
        const conversionRate = data?.conversionRate ?? (await (await import('./currency-rate.service.js')).default.getRateForCurrency(earning.month, earning.year, earning.currency));
        const amountInBDT = roundAmount(remainingAmount * conversionRate);
        const fees = data?.fees ?? 0;
        const tax = data?.tax ?? 0;

        const updateData: any = { 
            status: 'paid', 
            paidAmount: earning.totalAmount, 
            paidAt: new Date(),
            conversionRate: conversionRate,
            paidAmountBDT: roundAmount(earning.paidAmountBDT + amountInBDT),
            amountInBDT: roundAmount(earning.paidAmountBDT + amountInBDT),
            fees: roundAmount(earning.fees + fees),
            tax: roundAmount(earning.tax + tax)
        };
        if (data?.paidBy) updateData.paidBy = new Types.ObjectId(data.paidBy);
        
        const updateQuery: any = { $set: updateData };
        if (remainingAmount > 0.005) {
            updateQuery.$push = { payments: {
                invoiceNumber: `STATUS-PAID-${new Date().getTime()}`,
                amount: remainingAmount,
                amountInBDT: amountInBDT,
                method: 'Manual',
                transactionId: `TXN-ST-${new Date().getTime()}`,
                paidAt: new Date(),
                conversionRate: conversionRate,
                fees: fees,
                tax: tax
            } };
        }
        return EarningModel.findByIdAndUpdate(earningId, updateQuery, { new: true, session: session || null })
            .populate('clientId', 'clientId name email currency')
            .then(async (result: any) => {
                if (result?.orderIds?.length > 0) {
                    const OrderModel = (await import('../models/order.model.js')).default;
                    await (OrderModel as any).updateMany({ _id: { $in: result.orderIds } }, { $set: { isPaid: true } }, { session });
                }
                return result;
            }) as any;
    } else {
        const updated = await EarningModel.findByIdAndUpdate(
            earningId,
            { $set: { fees: 0, tax: 0, conversionRate: 1, amountInBDT: 0, status: 'unpaid', paidAmount: 0, paidAmountBDT: 0, payments: [] }, $unset: { paidAt: 1, paidBy: 1 } },
            { new: true, session: session || null }
        ).populate('clientId', 'clientId name email currency').then(async (result: any) => {
            if (result?.orderIds?.length > 0) {
                const OrderModel = (await import('../models/order.model.js')).default;
                await (OrderModel as any).updateMany({ _id: { $in: result.orderIds } }, { $set: { isPaid: false } }, { session });
            }
            return result;
        }) as any;
        try {
            const { default: commissionService } = await import('./commission.service.js');
            await commissionService.reverseEarningCommission(earningId, session);
        } catch (err) { console.error('[Toggle] Failed to reverse commission:', err); }
        return updated;
    }
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
    
    // Helper to process grouped data into CurrencyStat[]
    const processStats = (data: any[]) => {
        const statsMap = new Map<string, CurrencyStat>();
        data.forEach(item => {
            const currency = item._id.currency || 'USD';
            const status = item._id.status;
            
            if (!statsMap.has(currency)) {
                statsMap.set(currency, {
                    currency,
                    totalAmount: 0,
                    paidAmount: 0,
                    unpaidAmount: 0,
                    paidCount: 0,
                    unpaidCount: 0,
                    paidAmountBDT: 0
                });
            }
            
            const stat = statsMap.get(currency)!;
            const itemTotal = item.totalAmount || 0;
            const itemPaid = item.paidAmount || 0;
            const itemBDT = item.totalBDT || 0;
            
            stat.totalAmount += itemTotal;
            stat.paidAmount += itemPaid;
            stat.unpaidAmount += Math.max(0, itemTotal - itemPaid);
            stat.paidAmountBDT += itemBDT;
            
            if (status === 'paid') {
                stat.paidCount += item.count || 0;
            } else {
                stat.unpaidCount += item.count || 0;
            }
        });
        return Array.from(statsMap.values());
    };

    // 1. Determine period stats (today/week/month/year)
    let filteredCurrencyGrouped: any[] = [];
    if (params.filterType === "today" || params.filterType === "week") {
        const orderMatch: Record<string, any> = {};
        const paymentMatch: Record<string, any> = {};

        const start = params.filterType === "today" ? startOfDay(now) : startOfWeek(now, { weekStartsOn: 1 });
        const end = params.filterType === "today" ? endOfDay(now) : endOfWeek(now, { weekStartsOn: 1 });

        orderMatch.orderDate = { $gte: start, $lte: end };
        paymentMatch["payments.paidAt"] = { $gte: start, $lte: end };

        if (params.clientId) {
            const cId = new Types.ObjectId(params.clientId);
            orderMatch.clientId = cId;
            paymentMatch.clientId = cId;
        }
        if (params.clientIds && params.clientIds.length > 0) {
            const ids = params.clientIds.map((id) => new Types.ObjectId(id));
            orderMatch.clientId = { $in: ids };
            paymentMatch.clientId = { $in: ids };
        }

        // Aggregate orders for total amount in the period
        const orderStats = await OrderModel.aggregate([
            { $match: orderMatch },
            {
                $lookup: {
                    from: "clients",
                    localField: "clientId",
                    foreignField: "_id",
                    as: "client",
                },
            },
            { $unwind: "$client" },
            {
                $group: {
                    _id: { currency: { $ifNull: ["$client.currency", "USD"] } },
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalPrice" },
                },
            },
        ]);

        // Aggregate actual payments (deducting fees and taxes)
        const paymentStats = await EarningModel.aggregate([
            { $unwind: "$payments" },
            { $match: paymentMatch },
            {
                $group: {
                    _id: { currency: "$currency" },
                    paidAmount: { $sum: "$payments.amount" },
                    paidAmountBDT: { $sum: "$payments.amountInBDT" },
                },
            },
        ]);

        // Merge order stats and payment stats
        const currencies = new Set([
            ...orderStats.map((s) => s._id.currency),
            ...paymentStats.map((s) => s._id.currency),
        ]);

        filteredCurrencyGrouped = Array.from(currencies).map((curr) => {
            const os = orderStats.find((s) => s._id.currency === curr) || { count: 0, totalAmount: 0 };
            const ps = paymentStats.find((s) => s._id.currency === curr) || { paidAmount: 0, paidAmountBDT: 0 };

            return {
                _id: { currency: curr, status: ps.paidAmount > 0 ? "paid" : "unpaid" },
                count: os.count,
                totalAmount: os.totalAmount,
                paidAmount: ps.paidAmount,
                totalBDT: ps.paidAmountBDT,
            };
        });
    } else {
        const earningMatch: Record<string, any> = {};
        if (params.filterType === "month") {
            earningMatch.month = params.month || now.getMonth() + 1;
            earningMatch.year = params.year || now.getFullYear();
        } else if (params.filterType === "year") {
            earningMatch.year = params.year || now.getFullYear();
        }

        if (params.clientId) earningMatch.clientId = new Types.ObjectId(params.clientId);
        if (params.clientIds) {
            earningMatch.clientId = { $in: params.clientIds.map((id) => new Types.ObjectId(id)) };
        }

        filteredCurrencyGrouped = await EarningModel.aggregate([
            { $match: earningMatch },
            {
                $group: {
                    _id: { currency: "$currency", status: "$status" },
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$totalAmount" },
                    paidAmount: { $sum: "$paidAmount" },
                    totalBDT: { 
                        $sum: { 
                            $cond: [
                                { $and: [{ $eq: ["$status", "paid"] }, { $eq: [{ $ifNull: ["$paidAmountBDT", 0] }, 0] }] },
                                { $multiply: ["$totalAmount", { $ifNull: ["$conversionRate", 120] }] },
                                { $ifNull: ["$paidAmountBDT", 0] }
                            ]
                        } 
                    },
                },
            },
        ]);
    }

    const filteredCurrencyStats = processStats(filteredCurrencyGrouped);
    const filteredPaidBDT = filteredCurrencyGrouped.reduce((sum, item) => sum + (item.totalBDT || 0), 0);
    const filteredPaidAmount = filteredCurrencyStats.reduce((sum, s) => sum + s.paidAmount, 0);
    const filteredUnpaidAmount = filteredCurrencyStats.reduce((sum, s) => sum + s.unpaidAmount, 0);
    const filteredPaidCount = filteredCurrencyStats.reduce((sum, s) => sum + s.paidCount, 0);
    const filteredUnpaidCount = filteredCurrencyStats.reduce((sum, s) => sum + s.unpaidCount, 0);

    // 2. Get total (all-time) stats
    const totalMatch: Record<string, any> = {};
    if (params.clientId) totalMatch.clientId = new Types.ObjectId(params.clientId);
    if (params.clientIds) {
        totalMatch.clientId = { $in: params.clientIds.map((id) => new Types.ObjectId(id)) };
    }

    const totalCurrencyGrouped = await EarningModel.aggregate([
        ...(Object.keys(totalMatch).length > 0 ? [{ $match: totalMatch }] : []),
        {
            $group: {
                _id: { currency: "$currency", status: "$status" },
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
                paidAmount: { $sum: "$paidAmount" },
                totalBDT: { 
                    $sum: { 
                        $cond: [
                            { $and: [{ $eq: ["$status", "paid"] }, { $eq: [{ $ifNull: ["$paidAmountBDT", 0] }, 0] }] },
                            { $multiply: ["$totalAmount", { $ifNull: ["$conversionRate", 120] }] },
                            { $ifNull: ["$paidAmountBDT", 0] }
                        ]
                    } 
                },
            },
        },
    ]);

    const currencyStats = processStats(totalCurrencyGrouped);
    const totalPaidBDT = totalCurrencyGrouped.reduce((sum, item) => sum + (item.totalBDT || 0), 0);
    const totalPaidAmount = currencyStats.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalUnpaidAmount = currencyStats.reduce((sum, s) => sum + s.unpaidAmount, 0);
    const totalPaidCount = currencyStats.reduce((sum, s) => sum + s.paidCount, 0);
    const totalUnpaidCount = currencyStats.reduce((sum, s) => sum + s.unpaidCount, 0);

    return {
        totalUnpaidCount,
        totalUnpaidAmount,
        totalPaidCount,
        totalPaidAmount,
        totalPaidBDT,
        filteredUnpaidCount,
        filteredUnpaidAmount,
        filteredPaidCount,
        filteredPaidAmount,
        filteredPaidBDT,
        currencyStats,
        filteredCurrencyStats,
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const earning = await EarningModel.findById(id).session(session);
        if (!earning) {
            await session.commitTransaction();
            return null;
        }

        const finalAmount = await analyticsService.getCurrentFinalAmount(session);
        if (earning.amountInBDT > finalAmount) {
            throw new Error("Insufficient balance. Transaction exceeds available amount.");
        }
        const result = await EarningModel.findByIdAndDelete(id).session(session).lean();
        await session.commitTransaction();
        return result as any;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Get unique years from earnings for filter dropdown
async function getEarningYearsFromDB(): Promise<number[]> {
    const result = await EarningModel.aggregate([
        { $group: { _id: '$year' } },
        { $sort: { _id: -1 } },
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
    return ClientModel.find({ _id: { $in: clientIds } }).select('name clientId currency').lean();
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
        paidAmount: data.status === 'paid' ? data.totalAmount : 0,
        paidAmountBDT: data.status === 'paid' ? data.amountInBDT : 0,
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
    if (updates.clientId) {
        const earning = await EarningModel.findById(id);
        if (earning && earning.clientId.toString() !== updates.clientId.toString()) {
            const duplicate = await EarningModel.findOne({
                clientId: updates.clientId,
                month: updates.month || earning.month,
                year: updates.year || earning.year,
                _id: { $ne: id },
            });
            if (duplicate) throw new Error('An earning record already exists for this client in this month/year.');
        }
    }
    return EarningModel.findByIdAndUpdate(id, { $set: updates }, { new: true })
        .populate('clientId', 'clientId name email currency')
        .lean() as any;
}

// Sync earning data with actual orders
async function syncEarningFromOrders(id: string): Promise<IEarning | null> {
    const earning = await EarningModel.findById(id);
    if (!earning || earning.isLegacy) return earning;

    const OrderModel = (await import('../models/order.model.js')).default;
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
