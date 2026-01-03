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

    const matchStage: Record<string, unknown> = {};
    if (isActive !== undefined) {
        matchStage.isActive = isActive;
    }

    const [businesses, countResult] = await Promise.all([
        ExternalBusinessModel.aggregate([
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
                        { $project: { _id: 1, name: 1, email: 1 } },
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
            { $addFields: { createdBy: '$createdByUser' } },
            { $project: { createdByUser: 0 } },
            { $sort: { name: 1 } },
            { $skip: skip },
            { $limit: limit },
        ]),
        ExternalBusinessModel.aggregate([
            { $match: matchStage },
            { $count: 'total' },
        ]),
    ]);

    return {
        businesses: businesses as unknown as IExternalBusinessPopulated[],
        total: countResult[0]?.total || 0,
    };
}

async function getBusinessByIdFromDB(
    id: string
): Promise<IExternalBusinessPopulated | null> {
    const mongoose = await import('mongoose');
    const result = await ExternalBusinessModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
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
                    { $project: { _id: 1, name: 1, email: 1 } },
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
        { $addFields: { createdBy: '$createdByUser' } },
        { $project: { createdByUser: 0 } },
    ]);
    return (result[0] as IExternalBusinessPopulated) || null;
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
    const mongoose = await import('mongoose');
    const {
        page = 1,
        limit = 20,
        businessId,
        periodType,
        year,
        month,
    } = params;
    const skip = (page - 1) * limit;

    const matchStage: Record<string, unknown> = {};
    if (businessId)
        matchStage.businessId = new mongoose.Types.ObjectId(businessId);
    if (periodType) matchStage.periodType = periodType;
    if (year) matchStage.year = year;
    if (month) matchStage.month = month;

    const [transfers, countResult] = await Promise.all([
        ProfitTransferModel.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'externalbusinesses',
                    localField: 'businessId',
                    foreignField: '_id',
                    as: 'businessId',
                },
            },
            {
                $unwind: {
                    path: '$businessId',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'user',
                    let: { userId: '$transferredBy' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', { $toObjectId: '$$userId' }],
                                },
                            },
                        },
                        { $project: { _id: 1, name: 1, email: 1 } },
                    ],
                    as: 'transferredBy',
                },
            },
            {
                $unwind: {
                    path: '$transferredBy',
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $sort: { transferDate: -1 } },
            { $skip: skip },
            { $limit: limit },
        ]),
        ProfitTransferModel.aggregate([
            { $match: matchStage },
            { $count: 'total' },
        ]),
    ]);

    return {
        transfers: transfers as unknown as IProfitTransferPopulated[],
        total: countResult[0]?.total || 0,
        page,
        totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
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
