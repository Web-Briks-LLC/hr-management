import { Router } from 'express';
import { Role } from '../constants/role.js';
import { authorize } from '../middlewares/authorize.js';
import BranchControllers from '../controllers/branch.controller.js';

const router: Router = Router();

router.post(
    '/',
    authorize(Role.ADMIN, Role.SUPER_ADMIN),
    BranchControllers.createBranch,
);

router.get(
    '/',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER, Role.TEAM_LEADER),
    BranchControllers.getAllBranches,
);

export const branchRoute = router;
