import { Router } from 'express';
import jobPositionController from '../controllers/job-position.controller.js';
import jobApplicationController from '../controllers/job-application.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

// ============================================
// JOB POSITIONS
// ============================================

// Public routes (no auth required)
router.get('/positions/public', jobPositionController.getOpenPositions);
router.get('/positions/public/:slug', jobPositionController.getPositionBySlug);

// Admin routes (auth required)
router.get('/positions', jobPositionController.getAllPositions);
router.get('/positions/:id', jobPositionController.getPositionById);
router.post('/positions', jobPositionController.createPosition);
router.put('/positions/:id', jobPositionController.updatePosition);
router.patch('/positions/:id/toggle', jobPositionController.togglePosition);
router.delete('/positions/:id', jobPositionController.deletePosition);

// ============================================
// JOB APPLICATIONS
// ============================================

// Public routes (no auth required)
router.post(
    '/applications/public',
    upload.single('cvFile'),
    jobApplicationController.submitApplication
);

// Admin routes (auth required)
router.get('/applications', jobApplicationController.getAllApplications);
router.get('/applications/stats', jobApplicationController.getApplicationsStats);
router.get('/applications/:id', jobApplicationController.getApplicationById);
router.patch('/applications/:id/status', jobApplicationController.updateApplicationStatus);
router.delete('/applications/:id', jobApplicationController.deleteApplication);

export const careerRoute = router;
