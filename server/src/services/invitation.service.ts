import crypto from 'crypto';
import { Types } from 'mongoose';
import InvitationModel from '../models/invitation.model.js';
import StaffModel from '../models/staff.model.js';
import emailService from './email.service.js';
import envConfig from '../config/env.config.js';
import type {
    IInvitationCreate,
    IAcceptInvitation,
} from '../types/invitation.type.js';

const createInvitation = async (data: IInvitationCreate) => {
    const { expiryHours = 48, currentUserRole } = data;

    // Permission check: only super_admin can invite super_admin
    if (data.role === 'super_admin' && currentUserRole !== 'super_admin') {
        throw new Error('Only Super Admins can invite other Super Admins');
    }

    // Permission check: only super_admin or admin can invite admin roles
    if (
        ['admin', 'hr_manager'].includes(data.role) &&
        !['super_admin', 'admin'].includes(currentUserRole)
    ) {
        throw new Error('Only Admins can invite Admin roles');
    }

    // Check if email already has pending invitation
    const existingInvitation = await InvitationModel.findOne({
        email: data.email,
        isUsed: false,
        expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
        throw new Error('An active invitation already exists for this email');
    }

    // Check if user already exists
    const db = (await import('../lib/db.js')).client;
    const mongoClient = await db();
    const database = mongoClient.db(envConfig.db_name);
    const existingUser = await database
        .collection('user')
        .findOne({ email: data.email });

    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Create invitation with proper ObjectId conversion
    const invitation = await (InvitationModel.create as any)({
        email: data.email,
        token,
        expiresAt,
        salary: data.salary,
        role: data.role,
        department: data.department,
        designation: data.designation,
        branchId: data.branchId ? new Types.ObjectId(data.branchId) : undefined,
        shiftId: data.shiftId ? new Types.ObjectId(data.shiftId) : undefined,
        createdBy: new Types.ObjectId(data.createdBy),
    });

    // Send email
    const signupUrl = `${envConfig.client_url}/sign-up/${token}`;
    await emailService.sendInvitationEmail({
        to: data.email,
        designation: data.designation,
        department: data.department || '',
        salary: data.salary,
        signupUrl,
    });

    return invitation;
};

const validateToken = async (token: string) => {
    const invitation = await InvitationModel.findOne({ token })
        .populate('branchId')
        .populate('shiftId');

    if (!invitation) {
        throw new Error('Invalid invitation token');
    }

    if (invitation.isUsed) {
        throw new Error('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
        throw new Error('This invitation has expired');
    }

    return invitation;
};

const generateStaffId = async (): Promise<string> => {
    const allStaff = await StaffModel.find({ staffId: /^EMP/ })
        .select('staffId')
        .lean();

    let maxNum = 0;
    for (const s of allStaff) {
        const num = parseInt(s.staffId.replace('EMP', ''), 10);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    }

    return `EMP${String(maxNum + 1).padStart(4, '0')}`;
};

const acceptInvitation = async (data: IAcceptInvitation) => {
    const { token, ...userData } = data;

    // Validate token
    const invitation = await validateToken(token);

    // Create user account using Better Auth
    const { auth } = await import('../lib/auth.js');
    const db = (await import('../lib/db.js')).client;
    const mongoClient = await db();
    const database = mongoClient.db(envConfig.db_name);

    let userId: string | null = null;

    try {
        const newUser = await auth.api.signUpEmail({
            body: {
                email: invitation.email,
                password: userData.password,
                name: userData.name,
                role: invitation.role || 'staff',
            },
        });

        if (!newUser || !newUser.user) {
            throw new Error('Failed to create user account');
        }

        userId = newUser.user.id;

        // Set theme to system
        await database.collection('user').updateOne(
            { _id: new Types.ObjectId(userId) },
            {
                $set: {
                    theme: 'system',
                },
            },
        );

        // Generate staff ID with retry for race condition safety
        let staff: any = null;
        const MAX_RETRIES = 3;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const staffId = await generateStaffId();

                // Create staff profile with proper type conversion
                const staffPayload: any = {
                    userId: userId as any,
                    staffId,
                    phone: userData.phone,
                    branchId: invitation.branchId as any,
                    shiftId: invitation.shiftId
                        ? (invitation.shiftId as any)
                        : undefined,
                    department: invitation.department,
                    designation: invitation.designation,
                    joinDate: new Date(),
                    status: 'active' as const,
                    salary: invitation.salary,
                    salaryVisibleToEmployee: true,
                    profileCompleted: true,
                };

                if (userData.dateOfBirth)
                    staffPayload.dateOfBirth = userData.dateOfBirth;
                if (userData.bloodGroup)
                    staffPayload.bloodGroup = userData.bloodGroup;
                if (userData.nationalId)
                    staffPayload.nationalId = userData.nationalId;
                if (userData.address) staffPayload.address = userData.address;
                if (userData.emergencyContact)
                    staffPayload.emergencyContact = userData.emergencyContact;
                if (userData.fathersName)
                    staffPayload.fathersName = userData.fathersName;
                if (userData.mothersName)
                    staffPayload.mothersName = userData.mothersName;
                if (userData.spouseName)
                    staffPayload.spouseName = userData.spouseName;

                staff = await StaffModel.create(staffPayload);
                break; // Success, exit retry loop
            } catch (retryError: any) {
                // If duplicate key error on staffId, retry
                if (
                    retryError.code === 11000 &&
                    retryError.keyPattern?.staffId &&
                    attempt < MAX_RETRIES - 1
                ) {
                    continue;
                }
                throw retryError;
            }
        }

        if (!staff) {
            throw new Error(
                'Failed to create staff profile after multiple attempts',
            );
        }

        // Mark invitation as used
        invitation.isUsed = true;
        invitation.usedAt = new Date();
        await invitation.save();

        // Send Email Verification (Manual trigger after successful profile creation)
        try {
            await auth.api.sendVerificationEmail({
                body: {
                    email: invitation.email,
                },
            });
            console.log(
                `[Invitation] Verification email triggered for: ${invitation.email}`,
            );
        } catch (verifyError) {
            console.error(
                `[Invitation] Failed to trigger verification email:`,
                verifyError,
            );
        }

        return {
            user: { _id: userId, email: invitation.email, name: userData.name },
            staff,
        };
    } catch (error) {
        // Rollback: clean up all records created by Better Auth + staff
        if (userId) {
            const userOid = new Types.ObjectId(userId);
            await database.collection('user').deleteOne({ _id: userOid });
            await database.collection('account').deleteMany({ userId });
            await database.collection('session').deleteMany({ userId });
            await database
                .collection('verification')
                .deleteMany({ identifier: invitation.email });
        }
        throw error;
    }
};

const getInvitations = async (filters?: {
    isUsed?: boolean;
    email?: string;
}) => {
    const query: any = {};

    if (filters?.isUsed !== undefined) {
        query.isUsed = filters.isUsed;
    }

    if (filters?.email) {
        query.email = new RegExp(filters.email, 'i');
    }

    return await InvitationModel.find(query)
        .populate('branchId', 'name')
        .populate('shiftId', 'name')
        .sort({ createdAt: -1 });
};

const resendInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findById(invitationId);

    if (!invitation) {
        throw new Error('Invitation not found');
    }

    if (invitation.isUsed) {
        throw new Error('Cannot resend used invitation');
    }

    // Extend expiry by 48 hours
    invitation.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await invitation.save();

    // Resend email
    const signupUrl = `${envConfig.client_url}/sign-up/${invitation.token}`;
    await emailService.sendInvitationEmail({
        to: invitation.email,
        designation: invitation.designation,
        department: invitation.department || '',
        salary: invitation.salary,
        signupUrl,
        isReminder: true,
    });

    return invitation;
};

const cancelInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findById(invitationId);

    if (!invitation) {
        throw new Error('Invitation not found');
    }

    if (invitation.isUsed) {
        throw new Error('Cannot cancel used invitation');
    }

    await InvitationModel.deleteOne({ _id: invitationId });

    return { message: 'Invitation cancelled successfully' };
};

const createBulkInvitations = async (invitations: IInvitationCreate[]) => {
    const results = {
        success: [] as any[],
        failed: [] as any[],
    };

    for (const invitationData of invitations) {
        try {
            const invitation = await createInvitation(invitationData);
            results.success.push({
                email: invitationData.email,
                invitation,
            });
        } catch (error) {
            results.failed.push({
                email: invitationData.email,
                error: (error as Error).message,
            });
        }
    }

    return results;
};

export default {
    createInvitation,
    validateToken,
    acceptInvitation,
    getInvitations,
    resendInvitation,
    cancelInvitation,
    createBulkInvitations,
};
