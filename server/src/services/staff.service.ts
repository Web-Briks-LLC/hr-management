import mongoose, { Types } from 'mongoose';
import StaffModel from '../models/staff.model.js';
import type IStaff from '../types/staff.type.js';
import { startOfDay, endOfDay } from 'date-fns';

export type IStaffQueryParams = {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    shiftId?: string;
    status?: string;
    branchId?: string;
    excludeAdmins?: boolean;
};

async function getAllStaffsFromDB(query: IStaffQueryParams) {
    const {
        page = 1,
        limit = 10,
        search,
        department,
        designation,
        shiftId,
        status,
        branchId,
        excludeAdmins,
    } = query;

    const skip = (page - 1) * limit;
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const matchStage: any = {};

    if (search) {
        // We need to match on looked-up user fields, or basic fields
        // Since user lookup happens later, we might need a preliminary match or match after lookup.
        // For 'staffId', 'department', 'designation', we can match directly.
        // For user name/email, we need to match after user lookup.
        // To keep it simple and performant, let's match basic fields here, and complex search after lookup
        // OR better: do lookups first then match.
    }

    if (department) matchStage.department = department;
    if (designation) matchStage.designation = designation;
    if (status) matchStage.status = status;
    if (branchId) matchStage.branchId = new Types.ObjectId(branchId);

    const pipeline: any[] = [
        // 1. Initial Match (Basic fields)
        { $match: matchStage },

        // 2. Lookup User
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
                            image: 1,
                            role: 1,
                        },
                    },
                ],
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

        // 2.5 Exclude Admins (if requested)
        ...(excludeAdmins
            ? [
                  {
                      $match: {
                          'user.role': {
                              $nin: ['admin', 'branch_admin', 'super_admin'],
                          },
                      },
                  },
              ]
            : []),

        // 3. Search Filter (if applicable)
        ...(search
            ? [
                  {
                      $match: {
                          $or: [
                              { staffId: { $regex: search, $options: 'i' } },
                              {
                                  'user.name': {
                                      $regex: search,
                                      $options: 'i',
                                  },
                              },
                              {
                                  'user.email': {
                                      $regex: search,
                                      $options: 'i',
                                  },
                              },
                              {
                                  department: {
                                      $regex: search,
                                      $options: 'i',
                                  },
                              },
                              {
                                  designation: {
                                      $regex: search,
                                      $options: 'i',
                                  },
                              },
                          ],
                      },
                  },
              ]
            : []),

        // 4. Lookup Branch
        {
            $lookup: {
                from: 'branches',
                localField: 'branchId',
                foreignField: '_id',
                as: 'branch',
            },
        },
        { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },

        // 5. Lookup Today's Attendance
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

        // 6. Lookup Current Shift
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
                            _id: '$shift._id',
                            name: '$shift.name',
                            startTime: '$shift.startTime',
                            endTime: '$shift.endTime',
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
        { $addFields: { currentShift: '$shiftAssignment' } },
        { $project: { shiftAssignment: 0 } },

        // 7. Shift Filter
        ...(shiftId
            ? [
                  {
                      $match: {
                          'currentShift._id': new Types.ObjectId(shiftId),
                      },
                  },
              ]
            : []),

        { $sort: { createdAt: -1 } },
    ];

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline = [
        ...pipeline,
        { $skip: skip },
        { $limit: Number(limit) },
    ];

    const [totalResult, dataResult] = await Promise.all([
        StaffModel.aggregate(countPipeline),
        StaffModel.aggregate(dataPipeline),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;
    const totalPage = Math.ceil(total / Number(limit));

    return {
        staffs: dataResult,
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPage,
        },
    };
}

async function getStaffByIdFromDB(id: string) {
    const pipeline: any[] = [
        { $match: { _id: new Types.ObjectId(id) } },
        // Lookup User
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
                            image: 1,
                            role: 1,
                        },
                    },
                ],
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

        // Lookup Branch
        {
            $lookup: {
                from: 'branches',
                localField: 'branchId',
                foreignField: '_id',
                as: 'branch',
            },
        },
        { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },

        // Lookup Current Shift (Optimized: Only active and current date)
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
                                    { $lte: ['$startDate', new Date()] },
                                    {
                                        $or: [
                                            { $eq: ['$endDate', null] },
                                            { $gte: ['$endDate', new Date()] },
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
                            _id: '$shift._id',
                            name: '$shift.name',
                            startTime: '$shift.startTime',
                            endTime: '$shift.endTime',
                            workDays: '$shift.workDays',
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
        { $addFields: { currentShift: '$shiftAssignment' } },
        { $project: { shiftAssignment: 0 } },
    ];

    const result = await StaffModel.aggregate(pipeline);
    return result[0];
}

async function getStaffFromDB(userId: string) {
    const pipeline: any[] = [
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
                            image: 1,
                            role: 1,
                        },
                    },
                ],
                as: 'user',
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $match: {
                'user._id': new Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: 'branches',
                localField: 'branchId',
                foreignField: '_id',
                as: 'branch',
            },
        },
        { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                isSalaryPinSet: {
                    $cond: {
                        if: {
                            $and: [
                                { $ifNull: ['$salaryPin', false] },
                                { $ne: ['$salaryPin', ''] },
                            ],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                salaryPin: 0,
                salaryPinResetToken: 0,
                salaryPinResetExpires: 0,
            },
        },
    ];

    const result = await StaffModel.aggregate(pipeline);
    return result[0];
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
            { session },
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
            session,
        );

        if (!existingStaff) {
            // No staff record exists - create a new one
            // Generate a unique staffId
            const staffCount =
                await StaffModel.countDocuments().session(session);
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
        { new: true },
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

    // Verify password using bcrypt (matching Better-Auth default)
    // NOTE: Better-Auth stores passwords using bcrypt or scrypt. We assume standard bcrypt here.
    const bcrypt = (await import('bcrypt')).default;

    // Check if password exists
    if (!user.password) {
        throw new Error('User has no password set (OAuth only?)');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new Error('Invalid password');
    }

    // Get staff record
    const staff = await StaffModel.findOne({ userId }).lean();

    if (!staff) {
        throw new Error('Staff profile not found');
    }

    if (!staff.salaryVisibleToEmployee) {
        throw new Error(
            'Salary information is currently hidden by administrator',
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
        { new: true },
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

async function updateStaffInDB(payload: {
    staffId: string;
    staffData: Partial<IStaff>;
    role?: string;
    changedBy?: string;
}) {
    const { staffId, staffData, role, changedBy } = payload;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staff = await StaffModel.findOne({ staffId }).session(session);

        if (!staff) {
            throw new Error('Staff not found');
        }

        // If salary is being changed, we should probably log it (reusing logic or simplified)
        if (
            staffData.salary !== undefined &&
            staffData.salary !== staff.salary &&
            changedBy
        ) {
            const SalaryHistoryModel = (
                await import('../models/salary-history.model.js')
            ).default;
            await (SalaryHistoryModel.create as any)(
                [
                    {
                        staffId: staff._id,
                        previousSalary: staff.salary,
                        newSalary: staffData.salary,
                        changedBy,
                        reason: 'Administrative Update',
                    },
                ],
                { session },
            );
        }

        // Update Staff
        const updatedStaff = await StaffModel.findOneAndUpdate(
            { staffId },
            { $set: staffData },
            { new: true, session },
        );

        // Update User Role if provided
        if (role && staff.userId) {
            const UserModel = (await import('../models/user.model.js')).default;
            await UserModel.updateOne(
                { _id: staff.userId },
                { $set: { role } },
                { session },
            );
        }

        await session.commitTransaction();
        return updatedStaff;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

async function setSalaryPin(staffId: string, pin: string, _changedBy: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staff = await StaffModel.findOne({ staffId }).session(session);

        if (!staff) {
            throw new Error('Staff not found');
        }

        const bcrypt = (await import('bcrypt')).default;
        const hashedPin = await bcrypt.hash(
            pin,
            Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
        );

        await StaffModel.updateOne(
            { staffId },
            { $set: { salaryPin: hashedPin } },
            { session },
        );

        // Can log this action if needed
        // await AuditLog.create(...)

        await session.commitTransaction();
        return { success: true, message: 'Salary PIN set successfully' };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

async function verifySalaryPin(staffId: string, pin: string) {
    const staff = await StaffModel.findOne({ staffId }).select('+salaryPin');

    if (!staff) {
        throw new Error('Staff not found');
    }

    if (!staff.salaryPin) {
        throw new Error('Salary PIN not set');
    }

    const bcrypt = (await import('bcrypt')).default;
    const isMatch = await bcrypt.compare(pin, staff.salaryPin);

    if (!isMatch) {
        throw new Error('Invalid PIN');
    }

    return { success: true, message: 'PIN verified successfully' };
}

async function forgotSalaryPin(staffId: string) {
    const staff = await StaffModel.findOne({ staffId }).populate('userId');

    if (!staff) {
        throw new Error('Staff not found');
    }

    const user = staff.userId as unknown as { email: string; name?: string };

    if (!user || !user.email) {
        throw new Error('No email found for this staff member');
    }

    // Generate token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await StaffModel.updateOne(
        { staffId },
        {
            $set: {
                salaryPinResetToken: resetTokenHash,
                salaryPinResetExpires: resetExpires,
            },
        },
    );

    // Send Email
    const EmailService = (await import('./email.service.js')).default;
    const resetUrl = `${process.env.CLIENT_URL}/staffs/reset-pin?token=${resetToken}`;

    try {
        await EmailService.sendPinResetEmail({
            to: user.email,
            staffName: user.name || 'Staff Member',
            resetUrl,
        });
    } catch (error) {
        console.error('Failed to send reset email:', error);
        throw new Error('Failed to send reset email');
    }

    return { success: true, message: 'Reset link sent to your email' };
}

async function resetSalaryPin(token: string, newPin: string) {
    const crypto = await import('crypto');
    const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    const staff = await StaffModel.findOne({
        salaryPinResetToken: resetTokenHash,
        salaryPinResetExpires: { $gt: new Date() },
    });

    if (!staff) {
        throw new Error('Invalid or expired reset token');
    }

    const bcrypt = (await import('bcrypt')).default;
    const hashedPin = await bcrypt.hash(
        newPin,
        Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
    );

    await StaffModel.updateOne(
        { _id: staff._id },
        {
            $set: {
                salaryPin: hashedPin,
                salaryPinResetToken: undefined,
                salaryPinResetExpires: undefined,
            },
        },
    );

    return { success: true, message: 'PIN reset successfully' };
}

export default {
    getAllStaffsFromDB,
    getStaffByIdFromDB,
    getStaffFromDB,
    createStaffInDB,
    completeProfileInDB,
    updateProfileInDB,
    viewSalaryWithPassword,
    updateSalaryInDB,
    getSalaryHistory,
    updateStaffInDB,
    setSalaryPin,
    verifySalaryPin,
    forgotSalaryPin,
    resetSalaryPin,
};
