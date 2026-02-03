import { Router } from 'express';
import payrollController from '../controllers/payroll.controller.js';

const router: Router = Router();

router.get('/preview', payrollController.getPayrollPreview);
router.post('/process', payrollController.processPayment);
router.post('/bulk-process', payrollController.bulkProcessPayment);
router.post('/grace', payrollController.graceAttendance);
router.get('/absent-dates', payrollController.getAbsentDates);

export const payrollRoute = router;
