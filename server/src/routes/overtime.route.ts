import { Router } from 'express';
import OvertimeController from '../controllers/overtime.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const OvertimeRoutes = Router();

// Staff routes (Read Only)
OvertimeRoutes.get(
    '/my-overtime',
    authorize(
        Role.STAFF,
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.HR_MANAGER,
        Role.TEAM_LEADER,
    ),
    OvertimeController.getMyOvertime,
);

OvertimeRoutes.post(
    '/start',
    authorize(
        Role.STAFF,
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.HR_MANAGER,
        Role.TEAM_LEADER,
    ),
    OvertimeController.startStaffOvertime,
);

OvertimeRoutes.post(
    '/stop',
    authorize(
        Role.STAFF,
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.HR_MANAGER,
        Role.TEAM_LEADER,
    ),
    OvertimeController.stopStaffOvertime,
);

OvertimeRoutes.get(
    '/scheduled-today',
    authorize(
        Role.STAFF,
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.HR_MANAGER,
        Role.TEAM_LEADER,
    ),
    OvertimeController.getScheduledOvertimeToday,
);

// Admin routes (CRUD)
const adminRoles = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HR_MANAGER,
    Role.TEAM_LEADER,
];

OvertimeRoutes.post(
    '/create',
    authorize(...adminRoles),
    OvertimeController.createOvertime,
);

OvertimeRoutes.get(
    '/',
    authorize(...adminRoles),
    OvertimeController.getAllOvertime,
);

OvertimeRoutes.get(
    '/:id',
    authorize(...adminRoles),
    OvertimeController.getOvertimeById,
);

OvertimeRoutes.patch(
    '/:id',
    authorize(...adminRoles),
    OvertimeController.updateOvertime,
);

OvertimeRoutes.delete(
    '/:id',
    authorize(...adminRoles),
    OvertimeController.deleteOvertime,
);

export default OvertimeRoutes;
