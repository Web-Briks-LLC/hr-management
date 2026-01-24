import { Router } from 'express';
import InvitationController from '../controllers/invitation.controller.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router: Router = Router();

// Admin-only routes (create, list, resend, cancel)
router.post(
    '/create',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    InvitationController.createInvitation,
);

router.post(
    '/bulk',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    InvitationController.createBulkInvitations,
);

router.get(
    '/',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    InvitationController.getInvitations,
);

router.post(
    '/:id/resend',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    InvitationController.resendInvitation,
);

router.delete(
    '/:id',
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    InvitationController.cancelInvitation,
);

// Public routes (validate and accept)
router.get('/:token/validate', InvitationController.validateToken);

router.post('/:token/accept', InvitationController.acceptInvitation);

export const invitationRoute = router;
