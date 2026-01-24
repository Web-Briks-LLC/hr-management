import { Types } from 'mongoose';
import { Role } from '../constants/role.js';
import ShiftModel from '../models/shift.model.js';
import StaffModel from '../models/staff.model.js';
import type { IShift } from '../types/shift.type.js';
import ShiftAssignmentModel from '../models/shift-assignment.model.js';

async function getMyShiftFromDB(userId: string) {
    const staff = await StaffModel.findOne({ userId }).select('_id').lean();

    if (!staff) {
        throw new Error('Staff not found for this user');
    }

    const shiftAssignment = await ShiftAssignmentModel.findOne({
        staffId: staff._id,
        isActive: true,
    })
        .populate('shiftId')
        .lean();

    if (!shiftAssignment) {
        throw new Error('No active shift assigned to this staff');
    }

    const { shiftId, ...rest } = shiftAssignment;

    return {
        ...rest,
        shift: shiftId,
    };
}

const createShift = async (
    payload: IShift,
    userId: string,
    userRole: string,
) => {
    let branchId: any = null;

    if (userRole === Role.SUPER_ADMIN) {
        branchId = new Types.ObjectId(payload.branchId);
        if (!branchId) {
            throw new Error('Branch is required for super admin');
        }
    } else {
        const staff = await StaffModel.findOne({ userId }).select('branchId');

        if (!staff?.branchId) {
            throw new Error('Branch not found for this user');
        }

        branchId = staff.branchId;
    }

    const isExist = await ShiftModel.findOne({
        code: payload.code,
        branchId: branchId,
    });

    if (isExist) {
        throw new Error('Shift code already exists in this branch');
    }

    const shift = await ShiftModel.create({
        ...payload,
        branchId,
        createdBy: userId,
    });

    return shift;
};

const getAllShifts = async (userId: string, userRole: string) => {
    if (
        userRole === Role.SUPER_ADMIN ||
        userRole === Role.ADMIN ||
        userRole === Role.HR_MANAGER
    ) {
        return await ShiftModel.find().populate('branchId').sort({
            createdAt: -1,
        });
    }

    const staff = await StaffModel.findOne({ userId }).populate('branchId');

    if (!staff?.branchId) {
        throw new Error('Branch not found for this user');
    }

    return await ShiftModel.find({
        branchId: staff.branchId,
    })
        .populate('branchId')
        .sort({ createdAt: -1 });
};

const updateShift = async (
    id: string,
    payload: Partial<IShift>,
    userId: string,
    userRole: string,
) => {
    let query: any = { _id: id };

    if (
        userRole !== Role.SUPER_ADMIN &&
        userRole !== Role.ADMIN &&
        userRole !== Role.HR_MANAGER
    ) {
        const staff = await StaffModel.findOne({ userId }).select('branchId');

        if (!staff) {
            throw new Error('Branch not found for this user');
        }

        query.branchId = staff.branchId;
    }

    const shift = await ShiftModel.findOneAndUpdate(query, payload, {
        new: true,
        runValidators: true,
    });

    if (!shift) {
        throw new Error('Shift not found or not in your branch');
    }

    return shift;
};

const deleteShift = async (id: string, userId: string, userRole: string) => {
    let query: any = { _id: id };

    if (userRole !== Role.SUPER_ADMIN) {
        const staff = await StaffModel.findOne({ userId }).select('branchId');

        if (!staff?.branchId) {
            throw new Error('Branch not found for this user');
        }

        query.branchId = staff.branchId;
    }

    const shift = await ShiftModel.findOneAndDelete(query);

    if (!shift) {
        throw new Error('Shift not found or not in your branch');
    }

    return true;
};

const ShiftServices = {
    getMyShiftFromDB,
    createShift,
    getAllShifts,
    updateShift,
    deleteShift,
};

export default ShiftServices;
