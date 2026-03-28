import { OrderStatus, OrderPriority } from "@/types/order.type";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    quality_check: "Quality Check",
    revision: "Revision",
    completed: "Completed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    in_progress: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    quality_check: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
    revision: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    completed: "bg-green-500/20 text-green-700 dark:text-green-400",
    delivered: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export const ORDER_PRIORITY_COLORS: Record<OrderPriority, string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    urgent: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export const MONTH_OPTIONS = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

export const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const CLIENT_STATUS_OPTIONS = [
    { value: "active", label: "Active", color: "text-green-600 bg-green-100" },
    { value: "inactive", label: "Inactive", color: "text-gray-600 bg-gray-100" },
];

export const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
];
