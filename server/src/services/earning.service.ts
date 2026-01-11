import EarningModel from '../models/earning.model.js';
import OrderModel from '../models/order.model.js';
import type {
    IEarning,
    IEarningPopulated,
    CreateEarningData,
    EarningQueryParams,
} from '../types/earning.type.js';

async function createEarningInDB(
    data: CreateEarningData,
    userId: string
): Promise<IEarning> {
    // Calculate net amount and BDT amount
    const netAmount = data.totalOrderAmount - data.fees - data.tax;
    const amountInBDT = netAmount * data.conversionRate;

    const earning = new EarningModel({
        clientId: data.clientId,
        orderIds: data.orderIds,
        month: data.month,
        year: data.year,
        totalOrderAmount: data.totalOrderAmount,
        fees: data.fees,
        tax: data.tax,
        netAmount,
        currency: data.currency,
        conversionRate: data.conversionRate,
        amountInBDT,
        notes: data.notes,
        status: 'completed',
        createdBy: userId,
    });

    return earning.save();
}

async function getAllEarningsFromDB(params: EarningQueryParams): Promise<{
    earnings: IEarningPopulated[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const { page = 1, limit = 10, clientId, month, year, status } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = clientId;
    if (month) filter.month = month;
    if (year) filter.year = year;
    if (status) filter.status = status;

    const [earnings, total] = await Promise.all([
        EarningModel.find(filter)
            .populate('clientId', 'clientId name email')
            .populate('orderIds', 'orderName totalPrice')
            .sort({ createdAt: -1 })
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

async function getEarningByIdFromDB(
    id: string
): Promise<IEarningPopulated | null> {
    return EarningModel.findById(id)
        .populate('clientId', 'clientId name email')
        .populate('orderIds', 'orderName totalPrice')
        .lean() as Promise<IEarningPopulated | null>;
}

async function getOrdersForWithdrawal(
    clientId: string,
    month: number,
    year: number
): Promise<{
    orders: {
        _id: string;
        orderName: string;
        totalPrice: number;
        deliveredAt: Date;
    }[];
    totalAmount: number;
}> {
    // Get start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Find delivered orders for this client in this month
    const orders = await OrderModel.find({
        clientId,
        status: 'delivered',
        deliveredAt: { $gte: startDate, $lte: endDate },
    })
        .select('_id orderName totalPrice deliveredAt')
        .sort({ deliveredAt: -1 })
        .lean();

    const totalAmount = orders.reduce(
        (sum, order) => sum + order.totalPrice,
        0
    );

    return {
        orders: orders as unknown as {
            _id: string;
            orderName: string;
            totalPrice: number;
            deliveredAt: Date;
        }[],
        totalAmount,
    };
}

async function getEarningStatsFromDB(): Promise<{
    totalEarnings: number;
    thisMonthEarnings: number;
    totalWithdrawals: number;
    thisMonthWithdrawals: number;
}> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [totalStats, monthStats] = await Promise.all([
        EarningModel.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$amountInBDT' },
                    totalWithdrawals: { $sum: 1 },
                },
            },
        ]),
        EarningModel.aggregate([
            {
                $match: {
                    status: 'completed',
                    month: currentMonth,
                    year: currentYear,
                },
            },
            {
                $group: {
                    _id: null,
                    thisMonthEarnings: { $sum: '$amountInBDT' },
                    thisMonthWithdrawals: { $sum: 1 },
                },
            },
        ]),
    ]);

    return {
        totalEarnings: totalStats[0]?.totalEarnings || 0,
        thisMonthEarnings: monthStats[0]?.thisMonthEarnings || 0,
        totalWithdrawals: totalStats[0]?.totalWithdrawals || 0,
        thisMonthWithdrawals: monthStats[0]?.thisMonthWithdrawals || 0,
    };
}

async function updateEarningInDB(
    id: string,
    data: Partial<CreateEarningData>
): Promise<IEarning | null> {
    // Recalculate amounts if relevant fields are updated
    const updateData: Record<string, unknown> = { ...data };

    if (
        data.totalOrderAmount !== undefined ||
        data.fees !== undefined ||
        data.tax !== undefined ||
        data.conversionRate !== undefined
    ) {
        const earning = await EarningModel.findById(id);
        if (earning) {
            const totalOrderAmount =
                data.totalOrderAmount ?? earning.totalOrderAmount;
            const fees = data.fees ?? earning.fees;
            const tax = data.tax ?? earning.tax;
            const conversionRate =
                data.conversionRate ?? earning.conversionRate;

            const netAmount = totalOrderAmount - fees - tax;
            const amountInBDT = netAmount * conversionRate;

            updateData.netAmount = netAmount;
            updateData.amountInBDT = amountInBDT;
        }
    }

    return EarningModel.findByIdAndUpdate(id, updateData, { new: true })
        .populate('clientId', 'clientId name email')
        .populate('orderIds', 'orderName totalPrice')
        .lean() as Promise<IEarning | null>;
}

async function deleteEarningFromDB(id: string): Promise<IEarning | null> {
    return EarningModel.findByIdAndDelete(id).lean();
}

// Get monthly summary grouped by client for withdrawal page
interface ClientMonthlySummary {
    clientId: string;
    clientName: string;
    clientCode: string;
    currency: string;
    orderCount: number;
    totalAmount: number;
    orders: {
        _id: string;
        orderName: string;
        totalPrice: number;
        deliveredAt: Date;
    }[];
}

async function getMonthlySummaryByClient(
    month: number,
    year: number
): Promise<{
    clients: ClientMonthlySummary[];
    currencies: string[];
}> {
    // Get start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all order IDs that have already been withdrawn (in any earning)
    const withdrawnOrderIds = await EarningModel.distinct('orderIds');

    // Aggregate delivered orders by client for this month, excluding withdrawn orders
    const summary = await OrderModel.aggregate([
        {
            $match: {
                status: 'delivered',
                deliveredAt: { $gte: startDate, $lte: endDate },
                _id: { $nin: withdrawnOrderIds },
            },
        },
        {
            $lookup: {
                from: 'clients',
                localField: 'clientId',
                foreignField: '_id',
                as: 'client',
            },
        },
        { $unwind: '$client' },
        {
            $group: {
                _id: {
                    clientId: '$clientId',
                    currency: '$client.currency',
                },
                clientName: { $first: '$client.name' },
                clientCode: { $first: '$client.clientId' },
                currency: { $first: '$client.currency' },
                orderCount: { $sum: 1 },
                totalAmount: { $sum: '$totalPrice' },
                orders: {
                    $push: {
                        _id: '$_id',
                        orderName: '$orderName',
                        totalPrice: '$totalPrice',
                        deliveredAt: '$deliveredAt',
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                clientId: '$_id.clientId',
                clientName: 1,
                clientCode: 1,
                currency: 1,
                orderCount: 1,
                totalAmount: 1,
                orders: 1,
            },
        },
        { $sort: { totalAmount: -1 } },
    ]);

    // Get unique currencies from this month's data
    const currencies = [...new Set(summary.map((s) => s.currency || 'USD'))];

    return {
        clients: summary as ClientMonthlySummary[],
        currencies,
    };
}

export default {
    createEarningInDB,
    getAllEarningsFromDB,
    getEarningByIdFromDB,
    getOrdersForWithdrawal,
    getEarningStatsFromDB,
    updateEarningInDB,
    deleteEarningFromDB,
    getMonthlySummaryByClient,
};
