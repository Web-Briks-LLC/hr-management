import EarningModel from '../models/earning.model.js';
import ClientModel from '../models/client.model.js';
import type {
    IEarning,
    IEarningPopulated,
    CreateEarningForOrderData,
    WithdrawEarningData,
    BulkWithdrawData,
    EarningQueryParams,
    EarningStatsResult,
    ClientOrdersForWithdraw,
} from '../types/earning.type.js';
import {
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from 'date-fns';

// Create earning when order is created
async function createEarningForOrder(
    data: CreateEarningForOrderData
): Promise<IEarning> {
    const earning = new EarningModel({
        orderId: data.orderId,
        clientId: data.clientId,
        orderName: data.orderName,
        orderDate: data.orderDate,
        orderAmount: data.orderAmount,
        currency: data.currency,
        fees: 0,
        tax: 0,
        conversionRate: 1,
        netAmount: data.orderAmount,
        amountInBDT: 0,
        status: 'unpaid',
        createdBy: data.createdBy,
    });

    return earning.save();
}

// Update earning when order is updated
async function updateEarningForOrder(
    orderId: string,
    data: {
        orderName?: string;
        orderAmount?: number;
        orderDate?: Date;
        currency?: string;
    }
): Promise<IEarning | null> {
    const updateData: Record<string, unknown> = {};

    if (data.orderName !== undefined) updateData.orderName = data.orderName;
    if (data.orderAmount !== undefined) {
        updateData.orderAmount = data.orderAmount;
        // Recalculate netAmount if order amount changes
        const earning = await EarningModel.findOne({ orderId });
        if (earning && earning.status === 'unpaid') {
            updateData.netAmount = data.orderAmount;
        }
    }
    if (data.orderDate !== undefined) updateData.orderDate = data.orderDate;
    if (data.currency !== undefined) updateData.currency = data.currency;

    if (Object.keys(updateData).length === 0) return null;

    return EarningModel.findOneAndUpdate(
        { orderId },
        { $set: updateData },
        { new: true }
    ).lean();
}

// Delete earning when order is deleted
async function deleteEarningForOrder(
    orderId: string
): Promise<IEarning | null> {
    return EarningModel.findOneAndDelete({ orderId }).lean();
}

// Withdraw single earning (mark as paid)
async function withdrawSingleEarning(
    earningId: string,
    data: WithdrawEarningData
): Promise<IEarning | null> {
    const earning = await EarningModel.findById(earningId);
    if (!earning) return null;

    const fees = data.fees ?? 0;
    const tax = data.tax ?? 0;
    const netAmount = earning.orderAmount - fees - tax;
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
        { new: true }
    )
        .populate('clientId', 'clientId name email currency')
        .populate('orderId', 'orderName totalPrice status')
        .lean() as Promise<IEarning | null>;
}

// Bulk withdraw earnings (mark multiple as paid, split fee/tax equally)
async function withdrawBulkEarnings(data: BulkWithdrawData): Promise<{
    updatedCount: number;
    totalAmount: number;
    totalBDT: number;
}> {
    const earnings = await EarningModel.find({
        _id: { $in: data.earningIds },
        status: 'unpaid',
    });

    if (earnings.length === 0) {
        return { updatedCount: 0, totalAmount: 0, totalBDT: 0 };
    }

    // Split fee and tax equally among all earnings
    const feePerEarning = data.totalFees / earnings.length;
    const taxPerEarning = data.totalTax / earnings.length;

    let totalAmount = 0;
    let totalBDT = 0;

    // Update each earning
    const updatePromises = earnings.map(async (earning) => {
        const netAmount = earning.orderAmount - feePerEarning - taxPerEarning;
        const amountInBDT = netAmount * data.conversionRate;

        totalAmount += netAmount;
        totalBDT += amountInBDT;

        return EarningModel.findByIdAndUpdate(earning._id, {
            $set: {
                fees: feePerEarning,
                tax: taxPerEarning,
                conversionRate: data.conversionRate,
                netAmount,
                amountInBDT,
                status: 'paid',
                paidAt: new Date(),
                paidBy: data.paidBy,
                notes: data.notes,
            },
        });
    });

    await Promise.all(updatePromises);

    return {
        updatedCount: earnings.length,
        totalAmount,
        totalBDT,
    };
}

// Toggle earning status (paid <-> unpaid)
async function toggleEarningStatus(
    earningId: string,
    newStatus: 'paid' | 'unpaid',
    data?: WithdrawEarningData
): Promise<IEarning | null> {
    const earning = await EarningModel.findById(earningId);
    if (!earning) return null;

    if (newStatus === 'paid' && data) {
        // Marking as paid - need withdraw data
        return withdrawSingleEarning(earningId, data);
    } else if (newStatus === 'unpaid') {
        // Marking as unpaid - reset withdrawal data
        return EarningModel.findByIdAndUpdate(
            earningId,
            {
                $set: {
                    fees: 0,
                    tax: 0,
                    conversionRate: 1,
                    netAmount: earning.orderAmount,
                    amountInBDT: 0,
                    status: 'unpaid',
                },
                $unset: {
                    paidAt: 1,
                    paidBy: 1,
                },
            },
            { new: true }
        )
            .populate('clientId', 'clientId name email currency')
            .populate('orderId', 'orderName totalPrice status')
            .lean() as Promise<IEarning | null>;
    }

    return null;
}

// Build date filter based on filterType
function buildDateFilter(params: EarningQueryParams): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    const now = new Date();

    switch (params.filterType) {
        case 'today':
            filter.orderDate = {
                $gte: startOfDay(now),
                $lte: endOfDay(now),
            };
            break;
        case 'week':
            filter.orderDate = {
                $gte: startOfWeek(now, { weekStartsOn: 0 }),
                $lte: endOfWeek(now, { weekStartsOn: 0 }),
            };
            break;
        case 'month':
            if (params.month && params.year) {
                const monthStart = new Date(params.year, params.month - 1, 1);
                const monthEnd = endOfMonth(monthStart);
                filter.orderDate = {
                    $gte: monthStart,
                    $lte: monthEnd,
                };
            } else {
                filter.orderDate = {
                    $gte: startOfMonth(now),
                    $lte: endOfMonth(now),
                };
            }
            break;
        case 'year':
            if (params.year) {
                filter.orderDate = {
                    $gte: new Date(params.year, 0, 1),
                    $lte: new Date(params.year, 11, 31, 23, 59, 59, 999),
                };
            } else {
                filter.orderDate = {
                    $gte: startOfYear(now),
                    $lte: endOfYear(now),
                };
            }
            break;
        case 'range':
            if (params.startDate || params.endDate) {
                filter.orderDate = {};
                if (params.startDate) {
                    (filter.orderDate as Record<string, unknown>).$gte =
                        startOfDay(new Date(params.startDate));
                }
                if (params.endDate) {
                    (filter.orderDate as Record<string, unknown>).$lte =
                        endOfDay(new Date(params.endDate));
                }
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

    const filter: Record<string, unknown> = {};

    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    // Add date filter
    const dateFilter = buildDateFilter(params);
    Object.assign(filter, dateFilter);

    const [earnings, total] = await Promise.all([
        EarningModel.find(filter)
            .populate('clientId', 'clientId name email currency')
            .populate('orderId', 'orderName totalPrice status')
            .sort({ orderDate: -1 })
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
    id: string
): Promise<IEarningPopulated | null> {
    return EarningModel.findById(id)
        .populate('clientId', 'clientId name email currency')
        .populate('orderId', 'orderName totalPrice status')
        .lean() as Promise<IEarningPopulated | null>;
}

// Get stats with optional date filter
async function getEarningStatsWithFilter(
    params: EarningQueryParams
): Promise<EarningStatsResult> {
    // Get total stats (all time)
    const [totalStats, filteredStats] = await Promise.all([
        // All time stats
        EarningModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$orderAmount' },
                    totalBDT: { $sum: '$amountInBDT' },
                },
            },
        ]),
        // Filtered stats
        (async () => {
            const filter = buildDateFilter(params);
            if (Object.keys(filter).length === 0) return null;

            return EarningModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$orderAmount' },
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

// Get client orders for bulk withdraw
async function getClientOrdersForBulkWithdraw(
    clientId: string,
    month: number,
    year: number
): Promise<ClientOrdersForWithdraw | null> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = endOfMonth(monthStart);

    const earnings = await EarningModel.find({
        clientId,
        status: 'unpaid',
        orderDate: { $gte: monthStart, $lte: monthEnd },
    })
        .populate('clientId', 'clientId name email currency')
        .sort({ orderDate: -1 })
        .lean();

    const firstEarning = earnings[0];
    if (!firstEarning) return null;

    const clientData = firstEarning.clientId as unknown as
        | {
              _id: string;
              clientId: string;
              name: string;
              currency?: string;
          }
        | undefined;

    if (!clientData) return null;

    const client = clientData;

    const orders = earnings.map((e) => ({
        earningId: (e._id as unknown as { toString(): string }).toString(),
        orderId: e.orderId.toString(),
        orderName: e.orderName,
        orderDate: e.orderDate,
        orderAmount: e.orderAmount,
    }));

    const totalAmount = orders.reduce((sum, o) => sum + o.orderAmount, 0);

    return {
        clientId: client._id,
        clientName: client.name,
        clientCode: client.clientId,
        currency: client.currency || 'USD',
        orders,
        totalAmount,
        orderCount: orders.length,
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
                _id: { $year: '$orderDate' },
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
    year: number
): Promise<any[]> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = endOfMonth(monthStart);

    const clientIds = await EarningModel.distinct('clientId', {
        status: 'unpaid',
        orderDate: { $gte: monthStart, $lte: monthEnd },
    });

    if (clientIds.length === 0) return [];

    return ClientModel.find({ _id: { $in: clientIds } })
        .select('name clientId currency')
        .lean();
}

export default {
    createEarningForOrder,
    updateEarningForOrder,
    deleteEarningForOrder,
    withdrawSingleEarning,
    withdrawBulkEarnings,
    toggleEarningStatus,
    getEarningsWithDateFilter,
    getEarningByIdFromDB,
    getEarningStatsWithFilter,

    getClientOrdersForBulkWithdraw,
    getClientsWithUnpaidEarnings,
    deleteEarningFromDB,
    getEarningYearsFromDB,
};
