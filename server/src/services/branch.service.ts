import BranchModel from '../models/branch.model.js';
import type { IBranch } from '../types/branch.type.js';

const createBranch = async (payload: Partial<IBranch>, userId: string) => {
    const nameExist = await BranchModel.findOne({
        name: payload.name as string,
    });

    if (nameExist) {
        throw new Error('Branch name already exists');
    }

    const codeExist = await BranchModel.findOne({
        code: payload.code as string,
    });

    if (codeExist) {
        throw new Error('Branch code already exists');
    }

    const branch = await BranchModel.create({
        ...payload,
        code: payload.code?.toUpperCase() as string,
        createdBy: userId,
    });

    return branch;
};

const getAllBranches = async () => {
    return await BranchModel.find().sort({ createdAt: -1 }).select('-__v');
};

const BranchServices = {
    createBranch,
    getAllBranches,
};

export default BranchServices;
