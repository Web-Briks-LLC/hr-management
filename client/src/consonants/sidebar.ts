import { Role } from '@/consonants/role';
import {
    IconLayoutDashboard,
    IconArrowsShuffle,
    IconCalendarOff,
    IconNotes,
    IconClock,
    IconMail,
    IconCalendarStats,
    IconReceipt,
    IconUsers,
    IconPackage,
    IconChartBar,
    IconPigMoney,
    IconCreditCard,
} from '@tabler/icons-react';

export const sidebarData = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: IconLayoutDashboard,
        access: [
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.HR_MANAGER,
            Role.TEAM_LEADER,
            Role.STAFF,
        ],
    },
    {
        title: 'Staffs',
        url: '/staffs',
        icon: IconUsers,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
    },
    {
        title: 'Debit',
        url: '/debit',
        icon: IconCreditCard,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
    },

    {
        title: 'Invitations',
        url: '/invitations',
        icon: IconMail,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
    },
    {
        title: 'Attendance',
        url: '/attendance',
        icon: IconCalendarStats,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
    },
    {
        title: 'Expense',
        url: '/expense',
        icon: IconReceipt,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
    },
    {
        title: 'Clients',
        url: '/clients',
        icon: IconUsers,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
    },
    {
        title: 'Orders',
        url: '/orders',
        icon: IconPackage,
        access: [
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.HR_MANAGER,
            Role.TEAM_LEADER,
        ],
    },
    {
        title: 'Earnings',
        url: '/earnings',
        icon: IconReceipt,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
    },
    {
        title: 'Profit Share',
        url: '/profit-share',
        icon: IconPigMoney,
        access: [Role.SUPER_ADMIN, Role.ADMIN],
    },
    {
        title: 'Analytics',
        url: '/analytics',
        icon: IconChartBar,
        access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
    },
    {
        title: 'Shifting',
        url: '/shifting',
        icon: IconArrowsShuffle,
        access: [
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.HR_MANAGER,
            Role.TEAM_LEADER,
        ],
    },
    {
        title: 'Notices & Announcements',
        url: '/notices',
        icon: IconNotes,
        access: [
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.HR_MANAGER,
            Role.TEAM_LEADER,
            Role.STAFF,
        ],
    },
    {
        title: 'Leave Application',
        url: '/leave/apply',
        icon: IconCalendarOff,
        access: [
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.HR_MANAGER,
            Role.TEAM_LEADER,
            Role.STAFF,
        ],
    },
    {
        title: 'Overtime',
        url: '/overtime',
        icon: IconClock,
        access: [
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.HR_MANAGER,
            Role.TEAM_LEADER,
            Role.STAFF,
        ],
    },
];
