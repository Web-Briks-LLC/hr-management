import { Router } from 'express';
import { staffRoute } from './staff.route.js';
import { userRoute } from './user.route.js';
import { shiftRoute } from './shift.route.js';
import { branchRoute } from './branch.route.js';
import { attendanceRoute } from './attendance.route.js';
import { ShiftAssignmentRoute } from './shift-assignment.route.js';
import OvertimeRoutes from './overtime.route.js';
import { dashboardRoute } from './dashboard.route.js';
import { invitationRoute } from './invitation.route.js';
import { analyticsRoute } from './analytics.route.js';
import { notificationRoute } from './notification.route.js';
import { expenseRoute } from './expense.route.js';
import { clientRoute } from './client.route.js';
import { orderRoute } from './order.route.js';
import { serviceRoute } from './service.route.js';
import { returnFileFormatRoute } from './return-file-format.route.js';
import { earningRoute } from './earning.route.js';
import { metadataRoute } from './metadata.route.js';
import { profitShareRoute } from './profit-share.route.js';
import { debitRoute } from './debitRoutes.js';
import invoiceRoute from './invoice.route.js';
import { leaveRoute } from './leave.route.js';
import { noticeRoute } from './notice.route.js';

const router: Router = Router();

const moduleRoutes = [
    {
        path: '/users',
        route: userRoute,
    },
    {
        path: '/staffs',
        route: staffRoute,
    },
    {
        path: '/branches',
        route: branchRoute,
    },
    {
        path: '/shifts',
        route: shiftRoute,
    },
    {
        path: '/shift-assignments',
        route: ShiftAssignmentRoute,
    },
    {
        path: '/attendance',
        route: attendanceRoute,
    },
    {
        path: '/overtime',
        route: OvertimeRoutes,
    },
    {
        path: '/dashboard',
        route: dashboardRoute,
    },
    {
        path: '/invitations',
        route: invitationRoute,
    },
    {
        path: '/analytics',
        route: analyticsRoute,
    },
    {
        path: '/notifications',
        route: notificationRoute,
    },
    {
        path: '/expenses',
        route: expenseRoute,
    },
    {
        path: '/clients',
        route: clientRoute,
    },
    {
        path: '/orders',
        route: orderRoute,
    },
    {
        path: '/services',
        route: serviceRoute,
    },
    {
        path: '/return-file-formats',
        route: returnFileFormatRoute,
    },
    {
        path: '/earnings',
        route: earningRoute,
    },
    {
        path: '/metadata',
        route: metadataRoute,
    },
    {
        path: '/profit-share',
        route: profitShareRoute,
    },
    {
        path: '/debits',
        route: debitRoute,
    },
    {
        path: '/invoices',
        route: invoiceRoute,
    },
    {
        path: '/leave',
        route: leaveRoute,
    },
    {
        path: '/notices',
        route: noticeRoute,
    },
];

moduleRoutes.forEach(({ path, route }) => {
    router.use(path, route);
});

export default router;
