import { Router } from 'express';
import shiftAssignmentController from '../controllers/shift-assignment.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router: Router = Router();

router.post(
    '/assign',
    authorize(Role.ADMIN, Role.HR_MANAGER, Role.SUPER_ADMIN, Role.TEAM_LEADER),
    shiftAssignmentController.assignShift,
);

export const ShiftAssignmentRoute: Router = router;
