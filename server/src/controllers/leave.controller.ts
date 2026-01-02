import type { Request, Response } from 'express';
import leaveService from '../services/leave.service.js';
import StaffModel from '../models/staff.model.js';
import type {
    LeaveType,
    LeaveStatus,
} from '../types/leave_application.type.js';

// Apply for leave
async function applyForLeave(req: Request, res: Response) {
    try {
        const {
            leaveType,
            startDate,
            endDate,
            reason,
            staffId: targetStaffId,
        } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let staffIdToUse: string;

        // If admin provides staffId, use that (applying on behalf of staff)
        if (targetStaffId) {
            // Verify the target staff exists
            const targetStaff = await StaffModel.findById(targetStaffId);
            if (!targetStaff) {
                return res
                    .status(404)
                    .json({ message: 'Target staff not found' });
            }
            staffIdToUse = targetStaffId;
        } else {
            // Get staff record for current user (applying for self)
            const staff = await StaffModel.findOne({ userId });
            if (!staff) {
                return res
                    .status(404)
                    .json({ message: 'Staff record not found' });
            }
            staffIdToUse = staff._id.toString();
        }

        const application = await leaveService.applyForLeave({
            staffId: staffIdToUse,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            appliedBy: userId,
        });

        return res.status(201).json({
            message:
                'Leave application submitted successfully. It will expire at 11:59 PM today if not approved.',
            data: application,
        });
    } catch (error) {
        console.error('Error applying for leave:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

// Get all leave applications (admin)
async function getAllLeaveApplications(req: Request, res: Response) {
    try {
        const { staffId, status, leaveType, startDate, endDate, page, limit } =
            req.query;

        const result = await leaveService.getLeaveApplications({
            staffId: staffId as string | undefined,
            status: status as LeaveStatus | undefined,
            leaveType: leaveType as LeaveType | undefined,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });

        return res.status(200).json({
            message: 'Leave applications retrieved successfully',
            data: result.applications,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting leave applications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get pending leaves (for admin notification)
async function getPendingLeaves(_req: Request, res: Response) {
    try {
        const applications = await leaveService.getPendingLeaves();

        return res.status(200).json({
            message: 'Pending leave applications retrieved successfully',
            data: applications,
            count: applications.length,
        });
    } catch (error) {
        console.error('Error getting pending leaves:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get my leave applications (for staff)
async function getMyLeaveApplications(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { page, limit } = req.query;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const staff = await StaffModel.findOne({ userId });
        if (!staff) {
            return res.status(404).json({ message: 'Staff record not found' });
        }

        const result = await leaveService.getMyLeaveApplications(
            staff._id.toString(),
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 20
        );

        return res.status(200).json({
            message: 'Leave applications retrieved successfully',
            data: result.applications,
            meta: {
                total: result.total,
                page: result.page,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        console.error('Error getting my leave applications:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get leave application by ID
async function getLeaveApplicationById(req: Request, res: Response) {
    try {
        const { id } = req.params;

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const application = await leaveService.getLeaveApplicationById(id);

        if (!application) {
            return res
                .status(404)
                .json({ message: 'Leave application not found' });
        }

        return res.status(200).json({
            message: 'Leave application retrieved successfully',
            data: application,
        });
    } catch (error) {
        console.error('Error getting leave application:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Get leave balance
async function getLeaveBalance(req: Request, res: Response) {
    try {
        const { staffId } = req.params;
        const { year } = req.query;
        const userId = req.user?.id;

        // If no staffId provided, get current user's balance
        let targetStaffId = staffId;
        if (!targetStaffId && userId) {
            const staff = await StaffModel.findOne({ userId });
            if (staff) {
                targetStaffId = staff._id.toString();
            }
        }

        if (!targetStaffId) {
            return res.status(400).json({ message: 'Staff ID is required' });
        }

        const balance = await leaveService.getLeaveBalance(
            targetStaffId,
            year ? parseInt(year as string) : undefined
        );

        return res.status(200).json({
            message: 'Leave balance retrieved successfully',
            data: balance,
        });
    } catch (error) {
        console.error('Error getting leave balance:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Approve leave
async function approveLeave(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { approvedDates, paidLeaveDates, comment } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const application = await leaveService.approveLeave({
            applicationId: id,
            approvedBy: userId,
            approvedDates: approvedDates?.map((d: string) => new Date(d)),
            paidLeaveDates: paidLeaveDates?.map((d: string) => new Date(d)),
            comment,
        });

        return res.status(200).json({
            message: 'Leave application approved successfully',
            data: application,
        });
    } catch (error) {
        console.error('Error approving leave:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

// Reject leave
async function rejectLeave(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const application = await leaveService.rejectLeave(id, userId, comment);

        return res.status(200).json({
            message: 'Leave application rejected',
            data: application,
        });
    } catch (error) {
        console.error('Error rejecting leave:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

// Revoke approved leave (full or partial)
async function revokeLeave(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { reason, datesToRevoke } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const application = await leaveService.revokeLeave(
            id,
            userId,
            reason,
            datesToRevoke
        );

        const message =
            datesToRevoke && datesToRevoke.length > 0
                ? `${datesToRevoke.length} day(s) have been revoked and balance restored`
                : 'Leave has been revoked and balance restored';

        return res.status(200).json({
            message,
            data: application,
        });
    } catch (error) {
        console.error('Error revoking leave:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

// Cancel own application
async function cancelLeaveApplication(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        const application = await leaveService.cancelLeaveApplication(
            id,
            userId
        );

        return res.status(200).json({
            message: 'Leave application cancelled',
            data: application,
        });
    } catch (error) {
        console.error('Error cancelling leave:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

// Calculate working days preview (for frontend)
async function calculateWorkingDays(req: Request, res: Response) {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!startDate || !endDate) {
            return res
                .status(400)
                .json({ message: 'Start date and end date are required' });
        }

        const staff = await StaffModel.findOne({ userId });
        if (!staff) {
            return res.status(404).json({ message: 'Staff record not found' });
        }

        const workingDays = await leaveService.calculateWorkingDays(
            staff._id.toString(),
            new Date(startDate as string),
            new Date(endDate as string)
        );

        return res.status(200).json({
            message: 'Working days calculated successfully',
            data: {
                dates: workingDays,
                count: workingDays.length,
            },
        });
    } catch (error) {
        console.error('Error calculating working days:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Upload medical document for sick leave
async function uploadMedicalDocument(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const file = req.file;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id) {
            return res
                .status(400)
                .json({ message: 'Application ID is required' });
        }

        if (!file) {
            return res
                .status(400)
                .json({ message: 'Document file is required' });
        }

        const document = await leaveService.uploadMedicalDocument(
            id,
            userId,
            file
        );

        return res.status(200).json({
            message: 'Medical document uploaded successfully',
            data: document,
        });
    } catch (error) {
        console.error('Error uploading medical document:', error);
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return res.status(400).json({ message });
    }
}

export {
    applyForLeave,
    getAllLeaveApplications,
    getPendingLeaves,
    getMyLeaveApplications,
    getLeaveApplicationById,
    getLeaveBalance,
    approveLeave,
    rejectLeave,
    revokeLeave,
    cancelLeaveApplication,
    calculateWorkingDays,
    uploadMedicalDocument,
};
