import type { Request, Response } from 'express';
import StaffServices from '../services/staff.service.js';

const getStaffs = async (_req: Request, res: Response) => {
    try {
        const staffs = await StaffServices.getAllStaffsFromDB();

        return res.json({ success: true, staffs });
    } catch (err) {
        console.log(err);
        return res
            .status(500)
            .json({ success: false, message: (err as Error).message });
    }
};

async function getStaff(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });

        const staff = await StaffServices.getStaffFromDB(userId);

        // Return success with null staff if no profile exists yet
        // This is a valid state for new users or admin users without staff profiles
        return res.json({ success: true, staff: staff || null });
    } catch (err) {
        return res
            .status(500)
            .json({ success: false, message: (err as Error).message });
    }
}

async function createStaff(req: Request, res: Response) {
    try {
        const result = await StaffServices.createStaffInDB({ staff: req.body });

        return res.status(201).json({ success: true, staff: result });
    } catch (err) {
        return res
            .status(400)
            .json({ success: false, message: (err as Error).message });
    }
}

async function completeProfile(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const result = await StaffServices.completeProfileInDB({
            userId,
            staff: req.body,
        });

        return res.status(200).json({ success: true, staff: result });
    } catch (err) {
        const message = (err as Error).message;
        // Staff not found is a 404, other errors are 400
        const status = message.includes('not found') ? 404 : 400;
        return res.status(status).json({ success: false, message });
    }
}

async function updateProfile(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const result = await StaffServices.updateProfileInDB({
            userId,
            fields: req.body,
        });

        return res.status(200).json({ success: true, staff: result });
    } catch (err) {
        const message = (err as Error).message;
        const status = message.includes('not found') ? 404 : 400;
        return res.status(status).json({ success: false, message });
    }
}

async function viewSalary(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { password } = req.body;

        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: 'Unauthorized' });
        }

        if (!password) {
            return res
                .status(400)
                .json({ success: false, message: 'Password is required' });
        }

        const result = await StaffServices.viewSalaryWithPassword({
            userId,
            password,
        });

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        return res
            .status(400)
            .json({ success: false, message: (err as Error).message });
    }
}

async function updateSalary(req: Request, res: Response) {
    try {
        const { staffId } = req.params;
        const { salary, salaryVisibleToEmployee, reason } = req.body;

        if (!staffId) {
            return res
                .status(400)
                .json({ success: false, message: 'Staff ID is required' });
        }

        // Build payload conditionally to avoid passing undefined for optional properties
        const payload: {
            staffId: string;
            salary?: number;
            salaryVisibleToEmployee?: boolean;
            changedBy?: string;
            reason?: string;
        } = { staffId };

        if (salary !== undefined) payload.salary = salary;
        if (salaryVisibleToEmployee !== undefined)
            payload.salaryVisibleToEmployee = salaryVisibleToEmployee;
        if (req.user?.id) payload.changedBy = req.user.id;
        if (reason !== undefined) payload.reason = reason;

        const result = await StaffServices.updateSalaryInDB(payload);

        return res.status(200).json({ success: true, staff: result });
    } catch (err) {
        return res
            .status(400)
            .json({ success: false, message: (err as Error).message });
    }
}

async function exportStaffs(_req: Request, res: Response) {
    try {
        const staffs = await StaffServices.getAllStaffsFromDB();

        // Convert to CSV format
        const csvHeaders = [
            'Staff ID',
            'Name',
            'Email',
            'Phone',
            'Department',
            'Designation',
            'Branch',
            'Role',
            'Salary',
            'Join Date',
            'Status',
        ];

        const csvRows = staffs.map((staff: any) => [
            staff.staffId || '',
            staff.user?.name || '',
            staff.user?.email || '',
            staff.phone || '',
            staff.department || '',
            staff.designation || '',
            staff.branch?.name || '',
            staff.user?.role || '',
            staff.salary || 0,
            staff.joinDate ? new Date(staff.joinDate).toLocaleDateString() : '',
            staff.status || '',
        ]);

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=staff-export-${Date.now()}.csv`
        );

        return res.send(csvContent);
    } catch (err) {
        return res
            .status(500)
            .json({ success: false, message: (err as Error).message });
    }
}

export default {
    getStaffs,
    getStaff,
    createStaff,
    completeProfile,
    updateProfile,
    viewSalary,
    updateSalary,
    exportStaffs,
};
