import type { HydratedDocument } from 'mongoose';
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
    const netAmount = earning.totalAmount - fees - tax;
    const amountInBDT = netAmount * data.conversionRate;

    return EarningModel.findByIdAndUpdate(
        earningId,
        {
            $set: {
                fees,
                tax,
                conversionRate: data.conversionRate,
                netAmount,
                amountInBDT,
                status: 'paid',
                paidAt: new Date(),
                paidBy: data.paidBy,
                notes: data.notes,
            },
        },
        { new: true },
    )
        .populate('clientId', 'clientId name email currency')
        .lean() as Promise<IEarning | null>;
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
                    netAmount: earning.totalAmount,
                    amountInBDT: 0,
                    status: 'unpaid',
                },
                $unset: {
                    paidAt: 1,
                    paidBy: 1,
                },
            },
            { new: true },
        )
            .populate('clientId', 'clientId name email currency')
            .lean() as Promise<IEarning | null>;
    }

    return null;
}

// Build date filter based on filterType
function buildDateFilter(params: EarningQueryParams): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    const now = new Date();

    switch (params.filterType) {
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
        // For 'today', 'week', 'range' - these don't map well to monthly earnings
        // We'll just show all or filter by year
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

    const filter: Record<string, unknown> = {};

    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    // Add date filter
    const dateFilter = buildDateFilter(params);
    Object.assign(filter, dateFilter);

    const [earnings, total] = await Promise.all([
        EarningModel.find(filter)
            .populate('clientId', 'clientId name email currency')
            .sort({ year: -1, month: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
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
    const filter = buildDateFilter(params);

    const [totalStats, filteredStats] = await Promise.all([
        // All time stats
        EarningModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' },
                    totalBDT: { $sum: '$amountInBDT' },
                },
            },
        ]),
        // Filtered stats
        (async () => {
            if (Object.keys(filter).length === 0) return null;

            return EarningModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' },
                        totalBDT: { $sum: '$amountInBDT' },
                    },
                },
            ]);
        })(),
    ]);

    // Process total stats
    const totalUnpaid = totalStats.find((s) => s._id === 'unpaid') || {
        count: 0,
        totalAmount: 0,
        totalBDT: 0,
    };
    const totalPaid = totalStats.find((s) => s._id === 'paid') || {
        count: 0,
        totalAmount: 0,
        totalBDT: 0,
    };

    // Process filtered stats
    let filteredUnpaid = { count: 0, totalAmount: 0, totalBDT: 0 };
    let filteredPaid = { count: 0, totalAmount: 0, totalBDT: 0 };

    if (filteredStats) {
        filteredUnpaid = filteredStats.find((s) => s._id === 'unpaid') || {
            count: 0,
            totalAmount: 0,
            totalBDT: 0,
        };
        filteredPaid = filteredStats.find((s) => s._id === 'paid') || {
            count: 0,
            totalAmount: 0,
            totalBDT: 0,
        };
    } else {
        // No filter applied, use total stats
        filteredUnpaid = totalUnpaid;
        filteredPaid = totalPaid;
    }

    return {
        totalUnpaidCount: totalUnpaid.count,
        totalUnpaidAmount: totalUnpaid.totalAmount,
        totalPaidCount: totalPaid.count,
        totalPaidAmount: totalPaid.totalAmount,
        totalPaidBDT: totalPaid.totalBDT,
        filteredUnpaidCount: filteredUnpaid.count,
        filteredUnpaidAmount: filteredUnpaid.totalAmount,
        filteredPaidCount: filteredPaid.count,
        filteredPaidAmount: filteredPaid.totalAmount,
        filteredPaidBDT: filteredPaid.totalBDT,
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
};
