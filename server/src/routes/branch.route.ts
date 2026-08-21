import { Router } from 'express';
import { Role } from '../constants/role.js';
import { authorize } from '../middlewares/authorize.js';
import BranchControllers from '../controllers/branch.controller.js';

const router: Router = Router();

router.post(
    '/',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER),
    BranchControllers.createBranch,
);

router.get(
    '/',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER, Role.TEAM_LEADER, Role.STAFF),
    BranchControllers.getAllBranches,
);

router.put(
    '/:id',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER),
    BranchControllers.updateBranch,
);

router.delete(
    '/:id',
    authorize(Role.ADMIN, Role.SUPER_ADMIN, Role.HR_MANAGER),
    BranchControllers.deleteBranch,
);

export const branchRoute = router;
