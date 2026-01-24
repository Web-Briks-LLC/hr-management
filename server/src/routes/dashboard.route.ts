import { Router } from 'express';
import DashboardController from '../controllers/dashboard.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router: Router = Router();

// Admin dashboard - Only for Admin, HR Manager, and Super Admin
router.get(
    '/admin',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DashboardController.getAdminDashboard,
);

export const dashboardRoute = router;
