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

const updateBranch = async (id: string, payload: Partial<IBranch>) => {
    if (payload.name) {
        const nameExist = await BranchModel.findOne({
            _id: { $ne: id },
            name: payload.name,
        });
        if (nameExist) {
            throw new Error('Branch name already exists');
        }
    }
    if (payload.code) {
        const codeExist = await BranchModel.findOne({
            _id: { $ne: id },
            code: payload.code.toUpperCase(),
        });
        if (codeExist) {
            throw new Error('Branch code already exists');
        }
    }

    const branch = await BranchModel.findByIdAndUpdate(
        id,
        {
            ...payload,
            ...(payload.code && { code: payload.code.toUpperCase() }),
        },
        { new: true, runValidators: true }
    );

    if (!branch) {
        throw new Error('Branch not found');
    }
    return branch;
};

const deleteBranch = async (id: string) => {
    const branch = await BranchModel.findByIdAndDelete(id);
    if (!branch) {
        throw new Error('Branch not found');
    }
    return true;
};

const BranchServices = {
    createBranch,
    getAllBranches,
    updateBranch,
    deleteBranch,
};

export default BranchServices;
