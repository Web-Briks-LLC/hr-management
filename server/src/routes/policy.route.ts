import { Router } from 'express';
import {
    createPolicy,
    getPolicies,
    getPendingPolicies,
    acceptPolicy,
    togglePolicyStatus,
    deletePolicy,
    updatePolicy
} from '../controllers/policy.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

// Routes for every authenticated user
router.get('/pending', getPendingPolicies);
router.post('/:id/accept', acceptPolicy);
router.get('/', getPolicies); // Open to all for role-based filtering in controller

// Routes for Admins/HR Managers
router.post('/', authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER), createPolicy);
router.put('/:id', authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER), updatePolicy);
router.patch('/:id/status', authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER), togglePolicyStatus);
router.delete('/:id', authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER), deletePolicy);

export { router as policyRoute };
