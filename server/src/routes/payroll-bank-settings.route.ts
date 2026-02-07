import { Router } from 'express';
import { PayrollBankSettingsController } from '../controllers/payroll-bank-settings.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

// All routes require authorization
router.get(
    '/',
    authorize(Role.ADMIN, Role.HR_MANAGER, Role.SUPER_ADMIN),
    PayrollBankSettingsController.getAllBankSettings,
);
router.get(
    '/:id',
    authorize(Role.ADMIN, Role.HR_MANAGER, Role.SUPER_ADMIN),
    PayrollBankSettingsController.getBankSettingById,
);
router.post(
    '/',
    authorize(Role.ADMIN, Role.HR_MANAGER, Role.SUPER_ADMIN),
    PayrollBankSettingsController.createBankSetting,
);
router.put(
    '/:id',
    authorize(Role.ADMIN, Role.HR_MANAGER, Role.SUPER_ADMIN),
    PayrollBankSettingsController.updateBankSetting,
);
router.delete(
    '/:id',
    authorize(Role.ADMIN, Role.HR_MANAGER, Role.SUPER_ADMIN),
    PayrollBankSettingsController.deleteBankSetting,
);

export default router;
