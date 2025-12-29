import crypto from 'crypto';
import { Types } from 'mongoose';
import InvitationModel from '../models/invitation.model.js';
import StaffModel from '../models/staff.model.js';
import { sendMail } from '../lib/nodemailer.js';
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
    await sendMail({
        to: data.email,
        subject: "You're Invited to Join Our Team",
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Welcome to Our Team!</h1>
                <p>You've been invited to join our organization as a <strong>${
                    data.designation
                }</strong>.</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Position Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Role:</strong> ${
                            data.role === 'staff' ? 'Staff' : 'Team Leader'
                        }</li>
                        <li><strong>Department:</strong> ${
                            data.department || 'N/A'
                        }</li>
                        <li><strong>Designation:</strong> ${
                            data.designation
                        }</li>
                        <li><strong>Salary:</strong> ৳${data.salary.toLocaleString()}</li>
                    </ul>
                </div>
                
                <p>Click the button below to complete your registration:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${signupUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Registration</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">This link will expire in ${expiryHours} hours.</p>
                <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, please ignore this email.</p>
            </div>
        `,
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

const acceptInvitation = async (data: IAcceptInvitation) => {
    const { token, ...userData } = data;

    // Validate token
    const invitation = await validateToken(token);

    // Create user account using Better Auth
    const { auth } = await import('../lib/auth.js');

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

    const userId = newUser.user.id;

    // Manually set emailVerified to true and theme to system since we trust the invitation
    const db = (await import('../lib/db.js')).client;
    const mongoClient = await db();
    const database = mongoClient.db(envConfig.db_name);

    await database.collection('user').updateOne(
        { _id: new Types.ObjectId(userId) },
        {
            $set: {
                emailVerified: true,
                theme: 'system',
            },
        }
    );

    // Generate staff ID
    const staffCount = await StaffModel.countDocuments();
    const staffId = `EMP${String(staffCount + 1).padStart(4, '0')}`;

    // Create staff profile with proper type conversion
    const staff = await (StaffModel.create as any)({
        userId: userId as any,
        staffId,
        phone: userData.phone,
        branchId: invitation.branchId as any,
        department: invitation.department,
        designation: invitation.designation,
        joinDate: new Date(),
        status: 'active' as const,
        salary: invitation.salary,
        salaryVisibleToEmployee: true,
        dateOfBirth: userData.dateOfBirth,
        bloodGroup: userData.bloodGroup as any,
        nationalId: userData.nationalId,
        address: userData.address,
        emergencyContact: userData.emergencyContact,
        fathersName: userData.fathersName,
        mothersName: userData.mothersName,
        spouseName: userData.spouseName,
        profileCompleted: true,
    });

    // Mark invitation as used
    invitation.isUsed = true;
    invitation.usedAt = new Date();
    await invitation.save();

    return {
        user: { _id: userId, email: invitation.email, name: userData.name },
        staff,
    };
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
    await sendMail({
        to: invitation.email,
        subject: 'Reminder: Complete Your Registration',
        body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Reminder: Join Our Team</h1>
                <p>This is a reminder to complete your registration as <strong>${invitation.designation}</strong>.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${signupUrl}" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Registration</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">This link will expire in 48 hours.</p>
            </div>
        `,
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
