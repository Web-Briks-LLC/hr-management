import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import OvertimeModel from "../models/overtime.model.js";
import type { IOvertime } from "../types/overtime.type.js";
import StaffModel from "../models/staff.model.js";

const getOvertimeAggregationPipeline = (
    matchStage: any,
    postMatchStage: any = {},
): PipelineStage[] => [
    { $match: matchStage },
    // Lookup Staff
    {
        $lookup: {
            from: "staffs",
            localField: "staffId",
            foreignField: "_id",
            as: "staffId",
        },
    },
    { $unwind: { path: "$staffId", preserveNullAndEmptyArrays: true } },
    // Lookup Staff User (for name & photo)
    {
        $lookup: {
            from: "user",
            localField: "staffId.userId",
            foreignField: "_id",
            as: "staffUser",
        },
    },
    { $unwind: { path: "$staffUser", preserveNullAndEmptyArrays: true } },
    // Enrich Staff Object
    {
        $addFields: {
            "staffId.name": "$staffUser.name",
            "staffId.photo": "$staffUser.image",
        },
    },
    // Lookup CreatedBy
    {
        $lookup: {
            from: "user",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
        },
    },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
    // Lookup ApprovedBy
    {
        $lookup: {
            from: "user",
            localField: "approvedBy",
            foreignField: "_id",
            as: "approvedBy",
        },
    },
    { $unwind: { path: "$approvedBy", preserveNullAndEmptyArrays: true } },
    // Additional filters on looked-up fields
    { $match: postMatchStage },
    // Sort
    { $sort: { date: -1 } },
    // Cleanup
    {
        $project: {
            staffUser: 0,
            "createdBy.password": 0,
            "approvedBy.password": 0,
            "staffId.userId": 0, // optional cleanup
        },
    },
];

const createOvertimeInDB = async (
    payload: Partial<IOvertime> & { createdBy: string },
) => {
    const result = await OvertimeModel.create({
        ...payload,
        status: "approved",
        approvedBy: payload.createdBy, // Auto-approve by creator
    });
    return result;
};

const getAllOvertimeFromDB = async (query: Record<string, unknown>) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const matchStage: any = {};
    if (query.status) matchStage.status = query.status;

    const postMatchStage: any = {};
    if (query.staffId) {
        postMatchStage["staffId.staffId"] = {
            $regex: query.staffId as string,
            $options: "i",
        };
    }
    if (query.name) {
        postMatchStage["staffId.name"] = {
            $regex: query.name as string,
            $options: "i",
        };
    }

    const basePipeline = getOvertimeAggregationPipeline(
        matchStage,
        postMatchStage,
    );

    const result = await OvertimeModel.aggregate([
        ...basePipeline,
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ]);

    const total = result[0]?.metadata[0]?.total || 0;
    const overtimes = result[0]?.data || [];

    return {
        overtimes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

const getOvertimeByIdFromDB = async (id: string) => {
    const result = await OvertimeModel.aggregate(
        getOvertimeAggregationPipeline({ _id: new Types.ObjectId(id) }),
    );
    return result[0] || null;
};

const updateOvertimeInDB = async (id: string, payload: Partial<IOvertime>) => {
    // Get the overtime record before update
    const overtime = await OvertimeModel.findById(id).populate("staffId");

    const result = await OvertimeModel.findByIdAndUpdate(id, payload, {
        new: true,
    });

    // Send notification if status changed to approved or rejected
    if (
        payload.status &&
        overtime &&
        (payload.status === "approved" || payload.status === "rejected")
    ) {
        const { default: NotificationServices } =
            await import("./notification.service.js");
        const staff = overtime.staffId as any;

        if (staff?.userId) {
            await NotificationServices.notifyOvertimeStatus({
                staffUserId: staff.userId,
                overtimeId: overtime._id,
                status: payload.status,
                hours: Math.floor(overtime.durationMinutes / 60),
                date: new Date(overtime.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }),
                approvedBy: payload.approvedBy || overtime.createdBy!,
            });
        }
    }

    return result;
};

const deleteOvertimeFromDB = async (id: string) => {
    const result = await OvertimeModel.findByIdAndDelete(id);
    return result;
};

const getStaffOvertimeFromDB = async (userId: string) => {
    const staff = await StaffModel.findOne({
        userId: new Types.ObjectId(userId),
    });
    if (!staff) {
        throw new Error("Staff record not found");
    }
    const result = await OvertimeModel.aggregate(
        getOvertimeAggregationPipeline({ staffId: staff._id }),
    );
    return result;
};

const startOvertimeInDB = async (userId: string) => {
    const staff = await StaffModel.findOne({
        userId: new Types.ObjectId(userId),
    });
    if (!staff) throw new Error("Staff record not found");

    // Check for scheduled OT today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Look for a scheduled OT (created by admin, not checked in yet)
    const scheduledOT = await OvertimeModel.findOne({
        staffId: staff._id,
        date: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
        actualStartTime: { $exists: false }, // Not checked in yet
        endTime: { $exists: false }, // Not completed
    });

    if (!scheduledOT) {
        throw new Error(
            "No scheduled overtime found for today. Please contact your manager.",
        );
    }

    // Check if current time is >= scheduled start time
    const currentTime = new Date();
    const scheduledStartTime = new Date(scheduledOT.startTime);

    if (currentTime < scheduledStartTime) {
        const timeUntilStart = Math.ceil(
            (scheduledStartTime.getTime() - currentTime.getTime()) / 1000 / 60,
        );
        throw new Error(
            `OT will start at ${scheduledStartTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            })}. Please wait ${timeUntilStart} minutes.`,
        );
    }

    // User is checking in - update actualStartTime
    scheduledOT.actualStartTime = currentTime;
    await scheduledOT.save();

    return scheduledOT;
};

const stopOvertimeInDB = async (userId: string) => {
    const staff = await StaffModel.findOne({
        userId: new Types.ObjectId(userId),
    });
    if (!staff) throw new Error("Staff record not found");

    const activeOvertime = await OvertimeModel.findOne({
        staffId: staff._id,
        actualStartTime: { $exists: true }, // Must be checked in
        endTime: { $exists: false }, // Not ended yet
    });

    if (!activeOvertime) {
        throw new Error("No active overtime session found");
    }

    const endTime = new Date();

    // Calculate actual duration from actualStartTime (when user checked in)
    const actualDurationMs =
        endTime.getTime() - new Date(activeOvertime.actualStartTime!).getTime();
    const actualDurationMinutes = Math.floor(actualDurationMs / 1000 / 60);

    // Calculate expected duration (set by admin when creating OT)
    const expectedDurationMinutes = activeOvertime.durationMinutes || 0;

    // Calculate early stop
    let earlyStopMinutes = 0;
    if (
        expectedDurationMinutes > 0 &&
        actualDurationMinutes < expectedDurationMinutes
    ) {
        earlyStopMinutes = expectedDurationMinutes - actualDurationMinutes;
    }

    // Update the record
    activeOvertime.endTime = endTime;
    activeOvertime.durationMinutes = actualDurationMinutes; // Actual time worked
    activeOvertime.earlyStopMinutes = earlyStopMinutes;
    await activeOvertime.save();

    return activeOvertime;
};

const getScheduledOvertimeForToday = async (userId: string) => {
    const staff = await StaffModel.findOne({
        userId: new Types.ObjectId(userId),
    });
    if (!staff) throw new Error("Staff record not found");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Look for scheduled OT today (not checked in yet, not completed)
    const scheduledOT = await OvertimeModel.findOne({
        staffId: staff._id,
        date: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
        actualStartTime: { $exists: false },
        endTime: { $exists: false },
    });

    return scheduledOT;
};

export default {
    createOvertimeInDB,
    getAllOvertimeFromDB,
    getOvertimeByIdFromDB,
    updateOvertimeInDB,
    deleteOvertimeFromDB,
    getStaffOvertimeFromDB,
    startOvertimeInDB,
    stopOvertimeInDB,
    getScheduledOvertimeForToday,
};
