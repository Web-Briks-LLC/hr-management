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
    IconUserCircle,
    IconSpeakerphone,
} from '@tabler/icons-react';

export interface SidebarItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ strokeWidth?: number; className?: string }>;
    access: Role[];
}

export interface SidebarGroup {
    groupLabel: string;
    items: SidebarItem[];
}

export const sidebarGroups: SidebarGroup[] = [
    {
        groupLabel: 'Overview',
        items: [
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
                title: 'Analytics',
                url: '/analytics',
                icon: IconChartBar,
                access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
            },
        ],
    },
    {
        groupLabel: 'Business',
        items: [
            {
                title: 'Clients',
                url: '/clients',
                icon: IconUserCircle,
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
        ],
    },
    {
        groupLabel: 'Team Management',
        items: [
            {
                title: 'Staffs',
                url: '/staffs',
                icon: IconUsers,
                access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
            },
            {
                title: 'Invitations',
                url: '/invitations',
                icon: IconMail,
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
                title: 'Attendance',
                url: '/attendance',
                icon: IconCalendarStats,
                access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
            },
        ],
    },
    {
        groupLabel: 'HR & Leave',
        items: [
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
                title: 'Leave Management',
                url: '/leave/manage',
                icon: IconCalendarStats,
                access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
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
        ],
    },
    {
        groupLabel: 'Finance',
        items: [
            {
                title: 'Expense',
                url: '/expense',
                icon: IconReceipt,
                access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
            },
            {
                title: 'Debit',
                url: '/debit',
                icon: IconCreditCard,
                access: [Role.SUPER_ADMIN, Role.ADMIN],
            },
        ],
    },
    {
        groupLabel: 'Communication',
        items: [
            {
                title: 'Notices',
                url: '/notices',
                icon: IconSpeakerphone,
                access: [
                    Role.SUPER_ADMIN,
                    Role.ADMIN,
                    Role.HR_MANAGER,
                    Role.TEAM_LEADER,
                    Role.STAFF,
                ],
            },
            {
                title: 'Notice Management',
                url: '/notices/manage',
                icon: IconSpeakerphone,
                access: [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER],
            },
        ],
    },
];

// Flat array for backward compatibility
export const sidebarData = sidebarGroups.flatMap((group) => group.items);
