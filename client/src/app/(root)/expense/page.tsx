'use client';

import { useState, useMemo } from 'react';
import { useGetFinanceAnalyticsQuery } from '@/redux/features/analytics/analyticsApi';
import {
    useGetExpensesQuery,
    useGetExpenseStatsQuery,
    useCreateExpenseMutation,
    useUpdateExpenseMutation,
    useDeleteExpenseMutation,
    useGetExpenseCategoriesQuery,
    useCreateExpenseCategoryMutation,
    type Expense,
    type ExpenseCategory,
    type ExpenseQueryParams,
} from '@/redux/features/expense/expenseApi';
import { useGetAllBranchesQuery } from '@/redux/features/branch/branchApi';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    TrendingUp,
    Calendar as CalendarIcon,
    DollarSign,
    BarChart3,
    Edit2,
    Filter,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    ExpenseForm,
    type ExpenseFormData,
} from '@/components/expense/ExpenseForm';

const statusOptions = [
    {
        value: 'pending',
        label: 'Pending',
        color: 'text-yellow-600 bg-yellow-100',
    },
    { value: 'paid', label: 'Paid', color: 'text-green-600 bg-green-100' },
    {
        value: 'partial_paid',
        label: 'Partial Paid',
        color: 'text-orange-600 bg-orange-100',
    },
];

type FilterType = 'all' | 'today' | 'week' | 'month' | 'year' | 'range';

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Branch {
    _id: string;
    name: string;
}

export default function ExpensePage() {
    // Filter State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().getMonth() + 1,
    );
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(
        null,
    );
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] =
        useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Default form values for edit
    const [editDefaultValues, setEditDefaultValues] = useState<
        ExpenseFormData | undefined
    >(undefined);

    // Construct Query Params
    const queryParams = useMemo<ExpenseQueryParams>(() => {
        const params: ExpenseQueryParams = {
            page,
            limit,
            sortOrder: 'desc', // Default sort
        };

        if (search) params.search = search;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (branchFilter !== 'all') params.branchId = branchFilter;

        switch (filterType) {
            case 'today':
                params.filterType = 'today';
                break;
            case 'week':
                params.filterType = 'week';
                break;
            case 'month':
                params.filterType = 'month';
                params.month = selectedMonth;
                params.year = selectedYear;
                break;
            case 'year':
                params.filterType = 'year';
                params.year = selectedYear;
                break;
            case 'range':
                if (dateRange.from) {
                    params.filterType = 'range';
                    params.startDate = format(dateRange.from, 'yyyy-MM-dd');
                    if (dateRange.to) {
                        params.endDate = format(dateRange.to, 'yyyy-MM-dd');
                    }
                }
                break;
        }

        return params;
    }, [
        page,
        limit,
        search,
        statusFilter,
        branchFilter,
        filterType,
        selectedMonth,
        selectedYear,
        dateRange,
    ]);

    // Queries
    const {
        data: expenseData,
        isLoading,
        isFetching,
    } = useGetExpensesQuery(queryParams);

    // For stats, pass filters if selected
    const statsParams = useMemo(() => {
        const params: { branchId?: string; year?: number; month?: number } = {};

        if (branchFilter !== 'all') params.branchId = branchFilter;

        if (filterType === 'month') {
            params.month = selectedMonth;
            params.year = selectedYear;
        } else if (filterType === 'year') {
            params.year = selectedYear;
        }

        return params;
    }, [branchFilter, filterType, selectedMonth, selectedYear]);

    const { data: stats, isLoading: isLoadingStats } =
        useGetExpenseStatsQuery(statsParams);

    const { data: categories } = useGetExpenseCategoriesQuery(undefined);
    const { data: branchesData } = useGetAllBranchesQuery(undefined);

    // Mutations
    const [createExpense, { isLoading: isCreating }] =
        useCreateExpenseMutation();
    const [updateExpense, { isLoading: isUpdating }] =
        useUpdateExpenseMutation();
    const [deleteExpense, { isLoading: isDeleting }] =
        useDeleteExpenseMutation();
    const [createCategory, { isLoading: isCreatingCategory }] =
        useCreateExpenseCategoryMutation();

    const expenses = expenseData?.expenses || [];
    const pagination = expenseData?.pagination;
    const branches: Branch[] = branchesData?.branches || [];

    const { data: financeData } = useGetFinanceAnalyticsQuery({ months: 1 });
    const finalAmount = financeData?.summary?.finalAmount || 0;

    const handleCreateExpense = async (data: ExpenseFormData) => {
        if (finalAmount <= 0) {
            toast.error(
                'Cannot add expense when Final Amount (Profit - Shared + Debit) is 0 or negative',
            );
            return;
        }

        try {
            await createExpense({
                ...data,
                amount: parseFloat(data.amount),
            }).unwrap();
            toast.success('Expense created successfully');
            setIsAddDialogOpen(false);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create expense');
        }
    };

    const handleUpdateExpense = async (data: ExpenseFormData) => {
        if (!selectedExpense) return;
        try {
            await updateExpense({
                id: selectedExpense._id,
                ...data,
                amount: parseFloat(data.amount),
            }).unwrap();
            toast.success('Expense updated successfully');
            setIsEditDialogOpen(false);
            setSelectedExpense(null);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update expense');
        }
    };

    const handleDeleteExpense = async () => {
        if (!selectedExpense) return;
        try {
            await deleteExpense(selectedExpense._id).unwrap();
            toast.success('Expense deleted successfully');
            setIsDeleteDialogOpen(false);
            setSelectedExpense(null);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to delete expense');
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            toast.error('Category name is required');
            return;
        }
        try {
            await createCategory({ name: newCategoryName }).unwrap();
            toast.success('Category created successfully');
            setIsAddCategoryDialogOpen(false);
            setNewCategoryName('');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create category');
        }
    };

    const openEditDialog = (expense: Expense) => {
        setSelectedExpense(expense);
        setEditDefaultValues({
            date: new Date(expense.date),
            title: expense.title,
            categoryId: expense.category?._id || '',
            branchId: expense.branch?._id || '',
            amount: expense.amount.toString(),
            status: expense.status,
            note: expense.note || '',
        });
        setIsEditDialogOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoadingStats ? (
                    <>
                        {[...Array(4)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-32" />
                                </CardContent>
                            </Card>
                        ))}
                    </>
                ) : (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Today&apos;s Expense
                                </CardTitle>
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">
                                    {formatCurrency(stats?.today || 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    This Month
                                </CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">
                                    {formatCurrency(stats?.thisMonth || 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    This Year
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">
                                    {formatCurrency(stats?.thisYear || 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Avg Monthly
                                </CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">
                                    {formatCurrency(stats?.avgMonthly || 0)}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Main Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl">
                            Expense Management
                        </CardTitle>
                        <CardDescription>
                            Track and manage company expenses
                        </CardDescription>
                    </div>
                    <Dialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Expense
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Expense</DialogTitle>
                                <DialogDescription>
                                    Fill in the details to add a new expense
                                </DialogDescription>
                            </DialogHeader>
                            <ExpenseForm
                                onSubmit={handleCreateExpense}
                                isSubmitting={isCreating}
                                categories={categories}
                                branches={branches}
                                onAddCategory={() =>
                                    setIsAddCategoryDialogOpen(true)
                                }
                                submitLabel="Create"
                                onCancel={() => setIsAddDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mr-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Filter className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                                Filters:
                            </span>
                        </div>

                        {/* Search */}
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-[200px] h-9 bg-background/60"
                        />

                        {/* Date Filter Type */}
                        <Select
                            value={filterType}
                            onValueChange={(v) => {
                                setFilterType(v as FilterType);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[140px] h-9 bg-background/60">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                                <SelectItem value="range">Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Contextual Date Filters */}
                        {filterType === 'month' && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(v) =>
                                        setSelectedMonth(parseInt(v))
                                    }
                                >
                                    <SelectTrigger className="w-[120px] h-9 bg-background/60">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m) => (
                                            <SelectItem
                                                key={m.value}
                                                value={m.value.toString()}
                                            >
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={selectedYear.toString()}
                                    onValueChange={(v) =>
                                        setSelectedYear(parseInt(v))
                                    }
                                >
                                    <SelectTrigger className="w-[90px] h-9 bg-background/60">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map((y) => (
                                            <SelectItem
                                                key={y}
                                                value={y.toString()}
                                            >
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {filterType === 'year' && (
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(v) =>
                                    setSelectedYear(parseInt(v))
                                }
                            >
                                <SelectTrigger className="w-[100px] h-9 bg-background/60 animate-in fade-in slide-in-from-left-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEARS.map((y) => (
                                        <SelectItem
                                            key={y}
                                            value={y.toString()}
                                        >
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {filterType === 'range' && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-[240px] h-9 bg-background/60 justify-start text-left font-normal animate-in fade-in slide-in-from-left-2"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(
                                                        dateRange.from,
                                                        'MMM dd',
                                                    )}{' '}
                                                    -{' '}
                                                    {format(
                                                        dateRange.to,
                                                        'MMM dd',
                                                    )}
                                                </>
                                            ) : (
                                                format(dateRange.from, 'PPP')
                                            )
                                        ) : (
                                            'Pick a date range'
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="range"
                                        selected={{
                                            from: dateRange.from,
                                            to: dateRange.to,
                                        }}
                                        onSelect={(range) =>
                                            setDateRange({
                                                from: range?.from,
                                                to: range?.to,
                                            })
                                        }
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}

                        <div className="w-[1px] h-6 bg-border mx-1" />

                        {/* Status Filter */}
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[130px] h-9 bg-background/60">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {statusOptions.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Branch Filter */}
                        <Select
                            value={branchFilter}
                            onValueChange={(v) => {
                                setBranchFilter(v);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[150px] h-9 bg-background/60">
                                <SelectValue placeholder="Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Branches
                                </SelectItem>
                                {branches.map((branch) => (
                                    <SelectItem
                                        key={branch._id}
                                        value={branch._id}
                                    >
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                setFilterType('all');
                                setStatusFilter('all');
                                setBranchFilter('all');
                                setPage(1);
                                setDateRange({});
                            }}
                            className="ml-auto"
                        >
                            Reset
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border rounded-md overflow-hidden">
                        {isLoading ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r text-center">
                                            Date
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Title
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Category
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Branch
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Amount
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Note
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-32" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-16 ml-auto" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-6 w-16 rounded-full" />
                                            </TableCell>
                                            <TableCell className="border-r">
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-8 w-8" />
                                                    <Skeleton className="h-8 w-8" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border-r text-center">
                                            Date
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Title
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Category
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Branch
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Amount
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="border-r text-center">
                                            Note
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="text-center py-8 text-muted-foreground"
                                            >
                                                No expenses found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        expenses.map((expense: Expense) => {
                                            const statusOpt =
                                                statusOptions.find(
                                                    (s) =>
                                                        s.value ===
                                                        expense.status,
                                                );
                                            return (
                                                <TableRow key={expense._id}>
                                                    <TableCell className="border-r whitespace-nowrap">
                                                        {format(
                                                            new Date(
                                                                expense.date,
                                                            ),
                                                            'PPP',
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium border-r">
                                                        {expense.title}
                                                    </TableCell>
                                                    <TableCell className="border-r">
                                                        {expense.category
                                                            ?.name || '-'}
                                                    </TableCell>
                                                    <TableCell className="border-r">
                                                        {expense.branch?.name ||
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell className="font-medium border-r text-right">
                                                        {formatCurrency(
                                                            expense.amount,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="border-r text-center">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${statusOpt?.color}`}
                                                        >
                                                            {statusOpt?.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="max-w-[150px] truncate border-r">
                                                        {expense.note || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    openEditDialog(
                                                                        expense,
                                                                    )
                                                                }
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setSelectedExpense(
                                                                        expense,
                                                                    );
                                                                    setIsDeleteDialogOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="text-sm text-muted-foreground">
                                    Page {pagination.page} of{' '}
                                    {Math.max(1, pagination.pages)} (
                                    {pagination.total} total)
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">
                                        Rows per page
                                    </p>
                                    <Select
                                        value={`${limit}`}
                                        onValueChange={(value) => {
                                            setLimit(Number(value));
                                            setPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-[70px]">
                                            <SelectValue placeholder={limit} />
                                        </SelectTrigger>
                                        <SelectContent side="top">
                                            {[10, 20, 30, 40, 50].map(
                                                (pageSize) => (
                                                    <SelectItem
                                                        key={pageSize}
                                                        value={`${pageSize}`}
                                                    >
                                                        {pageSize}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1 || isFetching}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(pagination.pages, p + 1),
                                        )
                                    }
                                    disabled={
                                        page >= pagination.pages || isFetching
                                    }
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Expense</DialogTitle>
                        <DialogDescription>
                            Update the expense details
                        </DialogDescription>
                    </DialogHeader>
                    {editDefaultValues && (
                        <ExpenseForm
                            key={selectedExpense?._id}
                            defaultValues={editDefaultValues}
                            onSubmit={handleUpdateExpense}
                            isSubmitting={isUpdating}
                            categories={categories}
                            branches={branches}
                            onAddCategory={() =>
                                setIsAddCategoryDialogOpen(true)
                            }
                            submitLabel="Update"
                            onCancel={() => setIsEditDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this expense? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteExpense}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Category Dialog */}
            <Dialog
                open={isAddCategoryDialogOpen}
                onOpenChange={setIsAddCategoryDialogOpen}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                            Create a new expense category
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">
                                Category Name *
                            </Label>
                            <Input
                                id="category-name"
                                placeholder="e.g. Office Supplies"
                                value={newCategoryName}
                                onChange={(e) =>
                                    setNewCategoryName(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddCategoryDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategory}
                        >
                            {isCreatingCategory && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
