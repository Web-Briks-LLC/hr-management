import { Router } from 'express';
import StaffController from '../controllers/staff.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router: Router = Router();

router.get('/', StaffController.getStaffs);
router.get('/me', StaffController.getStaff);
router.get(
    '/export',
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.exportStaffs,
);

router.post(
    '/create',
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.createStaff,
);

router.put('/complete-profile', StaffController.completeProfile);

router.put('/update-profile', StaffController.updateProfile);

router.post('/view-salary', StaffController.viewSalary);

router.put(
    '/:staffId/salary',
    authorize(Role.HR_MANAGER, Role.ADMIN, Role.SUPER_ADMIN),
    StaffController.updateSalary,
);

export const staffRoute = router;
