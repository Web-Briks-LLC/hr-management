import { Router } from 'express';
import {
    createProductionLog,
    getAllProductionLogs,
    getActiveOrdersProgress,
    getOrderTimelineLogs,
    updateProductionLog,
    submitQCReview,
    deleteProductionLog,
    getProductionStats,
    getSanitizedActiveOrders,
    getOrderImageStatus,
    startWorkSession,
    getActiveWorkSession,
    getHeldWorkSessions,
    pauseWorkSession,
    resumeWorkSession,
    finishWorkSession,
    cancelWorkSession,
    adminCancelWorkSession,
    adminFinishWorkSession,
    reassignWorkSession,
    getLiveWorkSessions,
    getProductionEditors,
    flagImageRevision,
    qcApproveImages,
    getStaffPerformanceAnalytics,
    getStaffEditedImages,
} from '../controllers/production.controller.js';
import { authorizeProductionAccess } from '../middlewares/authorizeProductionAccess.js';
import { authorize } from '../middlewares/authorize.js';
import { Role } from '../constants/role.js';

const router = Router();

const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];
const qcRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER, Role.TEAM_LEADER];

// All production routes require authorizeProductionAccess (Admins + Non-Telemarketer Staff & Team Leaders)
router.use(authorizeProductionAccess);

// Workstation & Editor Real-Time Endpoints
router.get('/orders/sanitized', getSanitizedActiveOrders);
router.get('/orders/:orderId/images', getOrderImageStatus);
router.get('/staff-images', getStaffEditedImages);
router.post('/session/start', startWorkSession);
router.get('/session/active', getActiveWorkSession);
router.get('/session/held', getHeldWorkSessions);
router.post('/session/pause', pauseWorkSession);
router.post('/session/resume', resumeWorkSession);
router.post('/session/finish', finishWorkSession);
router.post('/session/cancel', cancelWorkSession);

// Supervisor floor-monitor endpoints (Admin / HR / Team Leader)
router.get('/sessions/live', authorize(...qcRoles), getLiveWorkSessions);
router.get('/editors', authorize(...qcRoles), getProductionEditors);
router.post('/session/admin-cancel', authorize(...qcRoles), adminCancelWorkSession);
router.post('/session/admin-finish', authorize(...qcRoles), adminFinishWorkSession);
router.post('/session/reassign', authorize(...qcRoles), reassignWorkSession);

router.post('/images/revision', authorize(...qcRoles), flagImageRevision);
router.post('/images/qc-approve', authorize(...qcRoles), qcApproveImages);
router.get('/analytics/staff', getStaffPerformanceAnalytics);

// Existing Shift Logs & Overview Endpoints
router.post('/', createProductionLog);
router.get('/', getAllProductionLogs);
router.get('/active-orders', getActiveOrdersProgress);
router.get('/stats', getProductionStats);
router.get('/order/:orderId/timeline', getOrderTimelineLogs);
router.patch('/:id', updateProductionLog);
router.post('/:id/qc', submitQCReview);
router.delete('/:id', authorize(...adminRoles), deleteProductionLog);

export { router as productionRoute };

