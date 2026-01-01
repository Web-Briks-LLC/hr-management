import mongoose, { Types } from 'mongoose';
import StaffModel from '../models/staff.model.js';
import type IStaff from '../types/staff.type.js';
import { startOfDay, endOfDay } from 'date-fns';

async function getAllStaffsFromDB() {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const staffs = await StaffModel.aggregate([
        // Lookup user info
        {
            $lookup: {
                from: 'user',
                let: { userId: '$userId' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$_id', { $toObjectId: '$$userId' }],
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                            emailVerified: 1,
                            image: 1,
                            role: 1,
                            theme: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        },
                    },
                ],
                as: 'user',
            },
        },
        {
            $unwind: {
                path: '$user',
                preserveNullAndEmptyArrays: true,
            },
        },
        // Lookup branch info
        {
            $lookup: {
                from: 'branches',
                localField: 'branchId',
                foreignField: '_id',
                as: 'branch',
            },
        },
        {
            $unwind: {
                path: '$branch',
                preserveNullAndEmptyArrays: true,
            },
        },
        // Lookup today's attendance
        {
            $lookup: {
                from: 'attendancedays',
                let: { staffId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$staffId', '$$staffId'] },
                                    { $gte: ['$date', dayStart] },
                                    { $lte: ['$date', dayEnd] },
                                ],
                            },
                        },
                    },
                    {
                        $project: {
                            status: 1,
                            checkInAt: 1,
                            checkOutAt: 1,
                            lateMinutes: 1,
                            totalMinutes: 1,
                        },
                    },
                ],
                as: 'todayAttendance',
            },
        },
        {
            $unwind: {
                path: '$todayAttendance',
                preserveNullAndEmptyArrays: true,
            },
        },
        // Lookup current shift assignment
        {
            $lookup: {
                from: 'shiftassignments',
                let: { staffId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$staffId', '$$staffId'] },
                                    { $lte: ['$startDate', now] },
                                    {
                                        $or: [
                                            { $eq: ['$endDate', null] },
                                            { $gte: ['$endDate', now] },
                                        ],
                                    },
                                    { $eq: ['$isActive', true] },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'shifts',
                            localField: 'shiftId',
                            foreignField: '_id',
                            as: 'shift',
                        },
                    },
                    {
                        $unwind: {
                            path: '$shift',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            'shift.name': 1,
                            'shift.startTime': 1,
                            'shift.endTime': 1,
                        },
                    },
                ],
                as: 'shiftAssignment',
            },
        },
        {
            $unwind: {
                path: '$shiftAssignment',
                preserveNullAndEmptyArrays: true,
            },
        },
        // Add currentShift field
        {
            $addFields: {
                currentShift: '$shiftAssignment.shift',
            },
        },
        // Remove intermediate field
        {
            $project: {
                shiftAssignment: 0,
            },
        },
        {
            $sort: { createdAt: -1 },
        },
    ]);

    return staffs;
}

async function getStaffFromDB(userId: string) {
    return StaffModel.findOne({ userId }).lean();
}

async function createStaffInDB(payload: { staff: Partial<IStaff> }) {
    const { staff } = payload;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const exists = await StaffModel.findOne({
            staffId: staff.staffId as string,
        }).session(session);

        if (exists) throw new Error('Staff with this ID already exists.');

        const newStaff = await StaffModel.create(
            [
                {
                    staffId: staff.staffId as string,
                    branchId: new Types.ObjectId(staff.branchId),
                    department: staff.department as string,
                    designation: staff.designation as string,
                    joinDate: staff.joinDate as Date,
                    status: 'active',
                    profileCompleted: false,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        return newStaff[0];
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

async function completeProfileInDB(payload: {
    userId: string;
    staff: Partial<IStaff>;
}) {
    const { userId, staff } = payload;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // First try to find staff by userId
        let existingStaff = await StaffModel.findOne({ userId }).session(
            session
        );

        if (!existingStaff) {
            // No staff record exists - create a new one
            // Generate a unique staffId
            const staffCount = await StaffModel.countDocuments().session(
                session
            );
            const staffId = `STF-${String(staffCount + 1).padStart(4, '0')}`;

            existingStaff = new StaffModel({
                userId,
                staffId,
                phone: staff.phone || '',
                designation: staff.designation || 'Staff',
                department: staff.department || 'General',
                joinDate: staff.joinDate || new Date(),
                status: 'active',
                profileCompleted: false,
            });
        }

        if (existingStaff.profileCompleted) {
            throw new Error('Profile already completed. Use update instead.');
        }

        existingStaff.set({
            ...staff,
            profileCompleted: true,
        });

        const result = await existingStaff.save({ session });

        await session.commitTransaction();
        return result;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

async function updateProfileInDB(payload: {
    userId: string;
    fields: Partial<IStaff>;
}) {
    const { userId, fields } = payload;

    // Find staff by userId (without requiring profileCompleted)
    const staff = await StaffModel.findOne({ userId });

    if (!staff) {
        throw new Error('No staff record found for this user.');
    }

    // Update the fields
    const updated = await StaffModel.findOneAndUpdate(
        { userId },
        { $set: fields },
        { new: true }
    );

    return updated;
}

async function viewSalaryWithPassword(payload: {
    userId: string;
    password: string;
}) {
    const { userId, password } = payload;

    // Get user from database
    const db = (await import('../lib/db.js')).client;
    const mongoClient = await db();
    const envConfig = (await import('../config/env.config.js')).default;
    const database = mongoClient.db(envConfig.db_name);

    const user = await database
        .collection('user')
        .findOne({ _id: new Types.ObjectId(userId) });

    if (!user) {
        throw new Error('User not found');
    }

    // Verify password using crypto
    const crypto = await import('crypto');
    const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');

    if (user.password !== hashedPassword) {
        throw new Error('Invalid password');
    }

    // Get staff record
    const staff = await StaffModel.findOne({ userId }).lean();

    if (!staff) {
        throw new Error('Staff profile not found');
    }

    if (!staff.salaryVisibleToEmployee) {
        throw new Error(
            'Salary information is currently hidden by administrator'
        );
    }

    return {
        salary: staff.salary,
        salaryVisibleToEmployee: staff.salaryVisibleToEmployee,
    };
}

async function updateSalaryInDB(payload: {
    staffId: string;
    salary?: number;
    salaryVisibleToEmployee?: boolean;
    changedBy?: string;
    reason?: string;
}) {
    const { staffId, salary, salaryVisibleToEmployee, changedBy, reason } =
        payload;

    const staff = await StaffModel.findById(staffId);
    if (!staff) throw new Error('Staff not found');

    // Save history if salary changed
    if (salary !== undefined && salary !== staff.salary && changedBy) {
        const SalaryHistoryModel = (
            await import('../models/salary-history.model.js')
        ).default;
        await (SalaryHistoryModel.create as any)({
            staffId,
            previousSalary: staff.salary,
            newSalary: salary,
            changedBy,
            reason,
        });
    }

    const updateData: any = {};
    if (salary !== undefined) updateData.salary = salary;
    if (salaryVisibleToEmployee !== undefined)
        updateData.salaryVisibleToEmployee = salaryVisibleToEmployee;

    const updated = await StaffModel.findByIdAndUpdate(
        staffId,
        { $set: updateData },
        { new: true }
    );

    return updated;
}

async function getSalaryHistory(staffId: string) {
    const SalaryHistoryModel = (
        await import('../models/salary-history.model.js')
    ).default;
    return await SalaryHistoryModel.find({ staffId: staffId as any })
        .sort({ createdAt: -1 })
        .limit(50);
}

export default {
    getAllStaffsFromDB,
    getStaffFromDB,
    createStaffInDB,
    completeProfileInDB,
    updateProfileInDB,
    viewSalaryWithPassword,
    updateSalaryInDB,
    getSalaryHistory,
};
