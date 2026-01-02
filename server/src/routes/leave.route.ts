import { Router } from 'express';
import {
    applyForLeave,
    getAllLeaveApplications,
    getPendingLeaves,
    getMyLeaveApplications,
    getLeaveApplicationById,
    getLeaveBalance,
    approveLeave,
    rejectLeave,
    revokeLeave,
    cancelLeaveApplication,
    calculateWorkingDays,
    uploadMedicalDocument,
} from '../controllers/leave.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

// Staff routes
router.post('/', applyForLeave);
router.get('/my', getMyLeaveApplications);
router.get('/balance', getLeaveBalance);
router.get('/balance/:staffId', getLeaveBalance);
router.get('/calculate-days', calculateWorkingDays);
router.patch('/:id/cancel', cancelLeaveApplication);
router.post(
    '/:id/upload-document',
    upload.single('document'),
    uploadMedicalDocument
);

// Admin routes
router.get('/', getAllLeaveApplications);
router.get('/pending', getPendingLeaves);
router.get('/:id', getLeaveApplicationById);
router.patch('/:id/approve', approveLeave);
router.patch('/:id/reject', rejectLeave);
router.patch('/:id/revoke', revokeLeave);

export { router as leaveRoute };
