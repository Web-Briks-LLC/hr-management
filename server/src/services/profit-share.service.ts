import ShareholderModel from '../models/shareholder.model.js';
import ProfitDistributionModel from '../models/profit-distribution.model.js';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import type {
    IShareholder,
    IShareholderPopulated,
    IProfitDistribution,
    IProfitDistributionPopulated,
    CreateShareholderData,
    UpdateShareholderData,
    DistributeProfitData,
    ProfitSummary,
    ShareholderQueryParams,
    DistributionQueryParams,
} from '../types/shareholder.type.js';

// ============ Shareholder Functions ============

async function createShareholderInDB(
    data: CreateShareholderData,
    userId: string
): Promise<IShareholder> {
    // Check if adding this percentage would exceed 100%
    const currentTotal = await getTotalAllocatedPercentage();
    if (currentTotal + data.percentage > 100) {
        throw new Error(
            `Cannot add shareholder. Total percentage would be ${
                currentTotal + data.percentage
            }%. Maximum allowed is 100%. Currently allocated: ${currentTotal}%`
        );
    }

    const shareholder = new ShareholderModel({
        ...data,
        createdBy: userId,
    });

    return shareholder.save();
}

async function getAllShareholdersFromDB(
    params: ShareholderQueryParams
): Promise<{
    shareholders: IShareholderPopulated[];
    total: number;
    totalPercentage: number;
}> {
    const { page = 1, limit = 50, isActive } = params;
    const skip = (page - 1) * limit;

    const matchStage: Record<string, unknown> = {};
    if (isActive !== undefined) matchStage.isActive = isActive;

    const [shareholders, countResult, totalPercentage] = await Promise.all([
        ShareholderModel.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'user',
                    let: { createdById: '$createdBy' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        '$_id',
                                        { $toObjectId: '$$createdById' },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                email: 1,
                            },
                        },
                    ],
                    as: 'createdByUser',
                },
            },
            {
                $unwind: {
                    path: '$createdByUser',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    createdBy: '$createdByUser',
                },
            },
            {
                $project: {
                    createdByUser: 0,
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
        ]),
        ShareholderModel.aggregate([
            { $match: matchStage },
            { $count: 'total' },
        ]),
        getTotalAllocatedPercentage(),
    ]);

    return {
        shareholders: shareholders as unknown as IShareholderPopulated[],
        total: countResult[0]?.total || 0,
        totalPercentage,
    };
}

async function getShareholderByIdFromDB(
    id: string
): Promise<IShareholderPopulated | null> {
    const result = await ShareholderModel.aggregate([
        { $match: { _id: new (await import('mongoose')).Types.ObjectId(id) } },
        {
            $lookup: {
                from: 'user',
                let: { createdById: '$createdBy' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$_id', { $toObjectId: '$$createdById' }],
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                        },
                    },
                ],
                as: 'createdByUser',
            },
        },
        {
            $unwind: {
                path: '$createdByUser',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $addFields: {
                createdBy: '$createdByUser',
            },
        },
        {
            $project: {
                createdByUser: 0,
            },
        },
    ]);
    return result[0] || null;
}

async function updateShareholderInDB(
    id: string,
    data: UpdateShareholderData
): Promise<IShareholder | null> {
    // If updating percentage, validate it won't exceed 100%
    if (data.percentage !== undefined) {
        const shareholder = await ShareholderModel.findById(id);
        if (!shareholder) return null;

        const currentTotal = await getTotalAllocatedPercentage();
        const newTotal =
            currentTotal - shareholder.percentage + data.percentage;

        if (newTotal > 100) {
            throw new Error(
                `Cannot update percentage. Total would be ${newTotal}%. Maximum allowed is 100%.`
            );
        }
    }

    // Don't populate - just return the updated document
    return ShareholderModel.findByIdAndUpdate(id, data, {
        new: true,
    }).lean() as Promise<IShareholder | null>;
}

async function deleteShareholderFromDB(
    id: string
): Promise<IShareholder | null> {
    return ShareholderModel.findByIdAndDelete(id).lean();
}

async function getTotalAllocatedPercentage(): Promise<number> {
    const result = await ShareholderModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$percentage' } } },
    ]);
    return result[0]?.total || 0;
}

// ============ Profit Summary Functions ============

async function getProfitSummaryFromDB(
    periodType: 'month' | 'year',
    year: number,
    month?: number
): Promise<ProfitSummary> {
    let earningsMatch: Record<string, unknown> = { year, status: 'completed' };
    let expenseMatch: Record<string, unknown> = {};

    if (periodType === 'month' && month) {
        earningsMatch.month = month;
        // For expenses, use date field with $month and $year operators in aggregation
    }

    const [earningsResult, expensesResult] = await Promise.all([
        EarningModel.aggregate([
            { $match: earningsMatch },
            { $group: { _id: null, total: { $sum: '$amountInBDT' } } },
        ]),
        ExpenseModel.aggregate([
            {
                $addFields: {
                    expenseMonth: { $month: '$date' },
                    expenseYear: { $year: '$date' },
                },
            },
            {
                $match:
                    periodType === 'month' && month
                        ? { expenseMonth: month, expenseYear: year }
                        : { expenseYear: year },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);

    const totalEarnings = earningsResult[0]?.total || 0;
    const totalExpenses = expensesResult[0]?.total || 0;
    const netProfit = totalEarnings - totalExpenses;

    return {
        totalEarnings,
        totalExpenses,
        netProfit,
        period: {
            type: periodType,
            month: periodType === 'month' ? month : undefined,
            year,
        },
    };
}

// ============ Distribution Functions ============

async function distributeProfitInDB(
    data: DistributeProfitData,
    userId: string
): Promise<IProfitDistribution[]> {
    // Get profit summary
    const summary = await getProfitSummaryFromDB(
        data.periodType,
        data.year,
        data.month
    );

    if (summary.netProfit <= 0) {
        throw new Error(
            `Cannot distribute profit. Net profit is ৳${summary.netProfit.toLocaleString()}. There must be positive profit to distribute.`
        );
    }

    // Get shareholders
    let shareholders;
    if (data.shareholderIds.includes('all')) {
        shareholders = await ShareholderModel.find({ isActive: true });
    } else {
        shareholders = await ShareholderModel.find({
            _id: { $in: data.shareholderIds },
            isActive: true,
        });
    }

    if (shareholders.length === 0) {
        throw new Error('No active shareholders found');
    }

    // Check for existing distributions in this period for these shareholders
    const existingFilter: Record<string, unknown> = {
        shareholderId: { $in: shareholders.map((s) => s._id) },
        periodType: data.periodType,
        year: data.year,
    };
    if (data.periodType === 'month' && data.month) {
        existingFilter.month = data.month;
    }

    const existingDistributions = await ProfitDistributionModel.find(
        existingFilter
    );
    if (existingDistributions.length > 0) {
        const existingNames = existingDistributions.map((d) => {
            const sh = shareholders.find(
                (s) => s._id.toString() === d.shareholderId.toString()
            );
            return sh?.name || 'Unknown';
        });
        throw new Error(
            `Profit already distributed to: ${existingNames.join(
                ', '
            )} for this period`
        );
    }

    // Create distribution records
    const distributions = shareholders.map((shareholder) => ({
        shareholderId: shareholder._id,
        periodType: data.periodType,
        month: data.month,
        year: data.year,
        totalProfit: summary.netProfit,
        sharePercentage: shareholder.percentage,
        shareAmount: (summary.netProfit * shareholder.percentage) / 100,
        status: 'distributed' as const,
        distributedAt: new Date(),
        distributedBy: userId,
        notes: data.notes,
    }));

    return ProfitDistributionModel.insertMany(distributions);
}

async function getDistributionsFromDB(
    params: DistributionQueryParams
): Promise<{
    distributions: IProfitDistributionPopulated[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const {
        page = 1,
        limit = 20,
        shareholderId,
        periodType,
        year,
        month,
        status,
    } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (shareholderId) filter.shareholderId = shareholderId;
    if (periodType) filter.periodType = periodType;
    if (year) filter.year = year;
    if (month) filter.month = month;
    if (status) filter.status = status;

    const [distributions, total] = await Promise.all([
        ProfitDistributionModel.find(filter)
            .populate('shareholderId', 'name email percentage')
            .populate('distributedBy', 'name email')
            .sort({ distributedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ProfitDistributionModel.countDocuments(filter),
    ]);

    return {
        distributions:
            distributions as unknown as IProfitDistributionPopulated[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

export default {
    createShareholderInDB,
    getAllShareholdersFromDB,
    getShareholderByIdFromDB,
    updateShareholderInDB,
    deleteShareholderFromDB,
    getTotalAllocatedPercentage,
    getProfitSummaryFromDB,
    distributeProfitInDB,
    getDistributionsFromDB,
};
