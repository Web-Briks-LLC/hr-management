import type { Request, Response } from 'express';
import PolicyModel from '../models/policy.model.js';
import StaffModel from '../models/staff.model.js';
import { broadcastPolicyPrompt } from '../socket.js';
import mongoose from 'mongoose';
import { Role } from '../constants/role.js';

export const createPolicy = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { title, description, branchId, department, designations, requiresAcceptance } = req.body;

        const policy = await PolicyModel.create({
            title,
            description,
            branchId: branchId || undefined,
            department: department || undefined,
            designations: designations?.length ? designations : undefined,
            requiresAcceptance,
            createdBy: userId,
        } as any);

        // If it requires acceptance, broadcast to targeted online users
        if (requiresAcceptance && (policy as any).isActive) {
            triggerPolicyBroadcast((policy as any)._id.toString());
        }

        return res.status(201).json({ success: true, policy });
    } catch (error) {
        console.error('Error creating policy:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getPolicies = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const isAdmin = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER].includes(userRole as Role);

        const matchStage: any = {};

        if (!isAdmin) {
            // For staff, we only show active and correctly targeted policies
            matchStage.isActive = true;

            const staff = userId ? await StaffModel.findOne({ userId }) : null;
            if (staff) {
                matchStage.$and = [
                    { $or: [{ branchId: staff.branchId }, { branchId: { $exists: false } }, { branchId: null }] },
                    { $or: [{ department: staff.department }, { department: { $exists: false } }, { department: null }] },
                    { $or: [{ designations: staff.designation }, { designations: { $exists: false } }, { designations: { $size: 0 } }, { designations: null }] }
                ];
            } else {
                // If no staff profile, they only get global policies
                matchStage.branchId = { $in: [null, undefined] };
                matchStage.department = { $in: [null, undefined] };
                matchStage.designations = { $in: [null, undefined, []] };
            }
        }

        const pipeline: any[] = [
            // 1. Initial Match (Role-based filtering)
            { $match: matchStage },

            // 2. Sort
            { $sort: { createdAt: -1 } },

            // 3. Lookup Branch
            {
                $lookup: {
                    from: 'branches',
                    localField: 'branchId',
                    foreignField: '_id',
                    as: 'branchDetails'
                }
            },
            { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },

            // 4. Lookup Creator User
            {
                $lookup: {
                    from: 'user',
                    let: { creatorId: '$createdBy' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$creatorId' }] } } },
                        { $project: { _id: 1, name: 1, email: 1, image: 1 } }
                    ],
                    as: 'creatorDetails'
                }
            },
            { $unwind: { path: '$creatorDetails', preserveNullAndEmptyArrays: true } }
        ];

        // 5. AcceptedBy Users (Only join for admins)
        if (isAdmin) {
            pipeline.push(
                { $unwind: { path: '$acceptedBy', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'user',
                        let: { acceptedUserId: '$acceptedBy.user' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$acceptedUserId' }] } } },
                            { $project: { _id: 1, name: 1, email: 1, image: 1 } }
                        ],
                        as: 'acceptedUserInfo'
                    }
                },
                { $unwind: { path: '$acceptedUserInfo', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$_id',
                        title: { $first: '$title' },
                        description: { $first: '$description' },
                        branchId: { $first: '$branchDetails' },
                        department: { $first: '$department' },
                        designations: { $first: '$designations' },
                        requiresAcceptance: { $first: '$requiresAcceptance' },
                        isActive: { $first: '$isActive' },
                        createdBy: { $first: '$creatorDetails' },
                        createdAt: { $first: '$createdAt' },
                        updatedAt: { $first: '$updatedAt' },
                        acceptedBy: {
                            $push: {
                                $cond: [
                                    { $gt: ['$acceptedBy', null] },
                                    {
                                        user: {
                                            _id: '$acceptedUserInfo._id',
                                            name: '$acceptedUserInfo.name',
                                            email: '$acceptedUserInfo.email',
                                            avatar: '$acceptedUserInfo.image'
                                        },
                                        acceptedAt: '$acceptedBy.acceptedAt'
                                    },
                                    '$$REMOVE'
                                ]
                            }
                        }
                    }
                }
            );
        } else {
            // For non-admins, project only necessary fields and strip acceptedBy
            pipeline.push({
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    branchId: '$branchDetails',
                    department: 1,
                    designations: 1,
                    requiresAcceptance: 1,
                    isActive: 1,
                    createdBy: '$creatorDetails',
                    createdAt: 1,
                    updatedAt: 1,
                    acceptedBy: { $literal: [] } // Hidden for staff
                }
            });
        }

        pipeline.push({ $sort: { createdAt: -1 } });

        const policies = await PolicyModel.aggregate(pipeline);

        return res.status(200).json({ success: true, policies });
    } catch (error) {
        console.error('Error fetching policies:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const updatePolicy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Ensure we don't accidentally update read-only fields
        delete updates.createdBy;
        delete updates.acceptedBy;

        const policy = await PolicyModel.findByIdAndUpdate(id, updates, { new: true });
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

        return res.status(200).json({ success: true, policy });
    } catch (error) {
        console.error('Error updating policy:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getPendingPolicies = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Exclude absolute admins (Super Admin and Admin) from the prompt
        if (req.user?.role === Role.SUPER_ADMIN || req.user?.role === Role.ADMIN) {
             return res.status(200).json({ success: true, policies: [] });
        }

        const staff = await StaffModel.findOne({ userId });

        const query: any = {
            isActive: true,
            requiresAcceptance: true,
            'acceptedBy.user': { $ne: new mongoose.Types.ObjectId(userId) }
        };

        if (staff) {
            query.$and = [
                { $or: [{ branchId: staff.branchId }, { branchId: { $exists: false } }, { branchId: null }] },
                { $or: [{ department: staff.department }, { department: { $exists: false } }, { department: null }] },
                { $or: [{ designations: staff.designation }, { designations: { $exists: false } }, { designations: { $size: 0 } }] }
            ];
        } else {
            // For other roles (like Team Leaders/HR if they don't have staff profile), they only get global policies
            query.branchId = { $exists: false };
            query.department = { $exists: false };
            query.designations = { $exists: false };
        }

        const pendingPolicies = await PolicyModel.find(query).select('-acceptedBy');

        return res.status(200).json({ success: true, policies: pendingPolicies });
    } catch (error) {
        console.error('Error fetching pending policies:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const acceptPolicy = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const policy = await PolicyModel.findById(id);
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

        if (!policy.acceptedBy.find((a) => a.user.toString() === userId)) {
            policy.acceptedBy.push({ user: userId, acceptedAt: new Date() });
            await policy.save();
        }

        return res.status(200).json({ success: true, message: 'Policy accepted' });
    } catch (error) {
        console.error('Error accepting policy:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const togglePolicyStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const policy = await PolicyModel.findByIdAndUpdate(id, { isActive }, { new: true });
        
        if (policy && policy.isActive && policy.requiresAcceptance) {
             triggerPolicyBroadcast(policy._id.toString());
        }

        return res.status(200).json({ success: true, policy });
    } catch (error) {
        console.error('Error toggling policy status:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const deletePolicy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await PolicyModel.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Policy deleted' });
    } catch (error) {
        console.error('Error deleting policy:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Helper function to broadcast
const triggerPolicyBroadcast = async (policyId: string) => {
    try {
        const policy = await PolicyModel.findById(policyId);
        if (!policy) return;

        const baseMatch: any = {};
        if (policy.branchId) baseMatch.branchId = policy.branchId;
        if (policy.department) baseMatch.department = policy.department;
        if (policy.designations && policy.designations.length > 0) baseMatch.designation = { $in: policy.designations };

        // We need to fetch targeted users but EXCLUDE admins
        // Let's use aggregation on StaffModel to join with User
        const pipeline: any[] = [
            { $match: baseMatch },
            {
                $lookup: {
                    from: "user",
                    let: { staffUserId: "$userId" },
                    pipeline: [
                         { 
                            $match: { 
                                $expr: { 
                                    $and: [
                                        { $eq: ["$_id", { $toObjectId: "$$staffUserId" }] },
                                        { $nin: ["$role", [Role.ADMIN, Role.SUPER_ADMIN]] }
                                    ]
                                } 
                            } 
                         },
                         { $project: { _id: 1 } }
                    ],
                    as: "validUser"
                }
            },
            { $unwind: "$validUser" },
            { $project: { userId: 1 } }
        ];

        const targetedStaffs = await StaffModel.aggregate(pipeline);
        const targetedStaffIds = targetedStaffs.map(s => s.userId?.toString() as string).filter(Boolean);

        const acceptedUserIds = policy.acceptedBy.map(a => a.user.toString());
        const pendingUserIds = targetedStaffIds.filter(id => !acceptedUserIds.includes(id));

        broadcastPolicyPrompt(pendingUserIds, policy);
    } catch (err) {
        console.error("Broadcast failed:", err);
    }
};


