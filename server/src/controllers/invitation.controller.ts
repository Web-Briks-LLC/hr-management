import type { Request, Response } from 'express';
import InvitationService from '../services/invitation.service.js';

const createInvitation = async (req: Request, res: Response) => {
    try {
        const createdBy = req.user?.id;

        if (!createdBy) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const invitation = await InvitationService.createInvitation({
            ...req.body,
            createdBy,
            currentUserRole: req.user?.role || '',
        });

        return res.status(201).json({
            success: true,
            message: 'Invitation sent successfully',
            data: invitation,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const validateToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required',
            });
        }

        const invitation = await InvitationService.validateToken(token);

        return res.status(200).json({
            success: true,
            data: invitation,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const acceptInvitation = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const result = await InvitationService.acceptInvitation({
            token,
            ...req.body,
        });

        return res.status(200).json({
            success: true,
            message: 'Account created successfully',
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const getInvitations = async (req: Request, res: Response) => {
    try {
        const { isUsed, email } = req.query;

        const filters: any = {};
        if (isUsed !== undefined) filters.isUsed = isUsed === 'true';
        if (email) filters.email = email as string;

        const invitations = await InvitationService.getInvitations(filters);

        return res.status(200).json({
            success: true,
            data: invitations,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const resendInvitation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Invitation ID is required',
            });
        }

        const invitation = await InvitationService.resendInvitation(id);

        return res.status(200).json({
            success: true,
            message: 'Invitation resent successfully',
            data: invitation,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const cancelInvitation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Invitation ID is required',
            });
        }

        const result = await InvitationService.cancelInvitation(id);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: (error as Error).message,
        });
    }
};

const createBulkInvitations = async (req: Request, res: Response) => {
    try {
        const createdBy = req.user?.id;

        if (!createdBy) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { invitations } = req.body;

        if (!Array.isArray(invitations) || invitations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invitations array is required',
            });
        }

        // Add createdBy to each invitation
        const invitationsWithCreator = invitations.map((inv) => ({
            ...inv,
            createdBy,
        }));

        const results = await InvitationService.createBulkInvitations(
            invitationsWithCreator
        );

        return res.status(200).json({
            success: true,
            message: `${results.success.length} invitations sent, ${results.failed.length} failed`,
            data: results,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: (error as Error).message,
        });
    }
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
