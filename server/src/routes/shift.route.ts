import { Router } from 'express';
import ShiftControllers from '../controllers/shift.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router: Router = Router();

router.get('/my-shift', ShiftControllers.getMyShift);

router.post(
    '/',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER, Role.TEAM_LEADER),
    ShiftControllers.createShift,
);

router.get(
    '/',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER, Role.TEAM_LEADER),
    ShiftControllers.getAllShifts,
);

router.patch(
    '/:id',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER),
    ShiftControllers.updateShift,
);

router.delete(
    '/:id',
    authorize(Role.ADMIN, Role.SUPER_ADMIN),
    ShiftControllers.deleteShift,
);

export const shiftRoute = router;
