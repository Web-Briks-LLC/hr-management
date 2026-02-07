import { Router } from 'express';
import ShiftOffDateController from '../controllers/shift-off-date.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

// Get my shift's off dates (for staff)
router.get('/my-off-dates', ShiftOffDateController.getMyShiftOffDates);

// Get off dates for a specific shift
router.get(
    '/:shiftId/off-dates',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    ShiftOffDateController.getOffDates,
);

// Add off dates to a shift
router.put(
    '/:shiftId/off-dates',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    ShiftOffDateController.addOffDates,
);

// Remove off dates from a shift
router.delete(
    '/:shiftId/off-dates',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    ShiftOffDateController.removeOffDates,
);

export default router;
