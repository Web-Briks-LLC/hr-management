import ExternalBusinessModel from '../models/external-business.model.js';
import ProfitTransferModel from '../models/profit-transfer.model.js';
import type {
    IExternalBusiness,
    IExternalBusinessPopulated,
    IProfitTransfer,
    IProfitTransferPopulated,
    CreateExternalBusinessData,
    UpdateExternalBusinessData,
    CreateProfitTransferData,
    ExternalBusinessQueryParams,
    ProfitTransferQueryParams,
    ProfitTransferStats,
} from '../types/external-business.type.js';

// ============ External Business Functions ============

async function createBusinessInDB(
    data: CreateExternalBusinessData,
    userId: string
): Promise<IExternalBusiness> {
    const business = new ExternalBusinessModel({
        ...data,
        createdBy: userId,
    });
    return await business.save();
}

async function getAllBusinessesFromDB(
    params: ExternalBusinessQueryParams
): Promise<{
    businesses: IExternalBusinessPopulated[];
    total: number;
}> {
    const { page = 1, limit = 50, isActive } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) {
        filter.isActive = isActive;
    }

    const [businesses, total] = await Promise.all([
        ExternalBusinessModel.find(filter)
            .populate('createdBy', 'name email')
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit)
            .lean<IExternalBusinessPopulated[]>(),
        ExternalBusinessModel.countDocuments(filter),
    ]);

    return { businesses, total };
}

async function getBusinessByIdFromDB(
    id: string
): Promise<IExternalBusinessPopulated | null> {
    return await ExternalBusinessModel.findById(id)
        .populate('createdBy', 'name email')
        .lean<IExternalBusinessPopulated>();
}

async function updateBusinessInDB(
    id: string,
    data: UpdateExternalBusinessData
): Promise<IExternalBusiness | null> {
    return await ExternalBusinessModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    );
}

async function deleteBusinessFromDB(
    id: string
): Promise<IExternalBusiness | null> {
    return await ExternalBusinessModel.findByIdAndDelete(id);
}

// ============ Profit Transfer Functions ============

async function createTransferInDB(
    data: CreateProfitTransferData,
    userId: string
): Promise<IProfitTransfer> {
    const transfer = new ProfitTransferModel({
        ...data,
        transferredBy: userId,
    });
    return await transfer.save();
}

async function getTransfersFromDB(params: ProfitTransferQueryParams): Promise<{
    transfers: IProfitTransferPopulated[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const {
        page = 1,
        limit = 20,
        businessId,
        periodType,
        year,
        month,
    } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (businessId) filter.businessId = businessId;
    if (periodType) filter.periodType = periodType;
    if (year) filter.year = year;
    if (month) filter.month = month;

    const [transfers, total] = await Promise.all([
        ProfitTransferModel.find(filter)
            .populate('businessId', 'name')
            .populate('transferredBy', 'name email')
            .sort({ transferDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean<IProfitTransferPopulated[]>(),
        ProfitTransferModel.countDocuments(filter),
    ]);

    return {
        transfers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
}

async function getTransferStatsFromDB(
    year?: number,
    month?: number
): Promise<ProfitTransferStats> {
    const matchStage: Record<string, unknown> = {};
    if (year) matchStage.year = year;
    if (month) matchStage.month = month;

    const [totalResult, byBusinessResult] = await Promise.all([
        ProfitTransferModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalTransferred: { $sum: '$amount' },
                    transferCount: { $sum: 1 },
                },
            },
        ]),
        ProfitTransferModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$businessId',
                    totalAmount: { $sum: '$amount' },
                    transferCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'externalbusinesses',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'business',
                },
            },
            { $unwind: '$business' },
            {
                $project: {
                    businessId: '$_id',
                    businessName: '$business.name',
                    totalAmount: 1,
                    transferCount: 1,
                },
            },
            { $sort: { totalAmount: -1 } },
        ]),
    ]);

    return {
        totalTransferred: totalResult[0]?.totalTransferred || 0,
        transferCount: totalResult[0]?.transferCount || 0,
        byBusiness: byBusinessResult,
    };
}

async function deleteTransferFromDB(
    id: string
): Promise<IProfitTransfer | null> {
    return await ProfitTransferModel.findByIdAndDelete(id);
}

async function getTransferCountByBusiness(businessId: string): Promise<number> {
    return await ProfitTransferModel.countDocuments({ businessId });
}

export default {
    createBusinessInDB,
    getAllBusinessesFromDB,
    getBusinessByIdFromDB,
    updateBusinessInDB,
    deleteBusinessFromDB,
    createTransferInDB,
    getTransfersFromDB,
    getTransferStatsFromDB,
    deleteTransferFromDB,
    getTransferCountByBusiness,
};
