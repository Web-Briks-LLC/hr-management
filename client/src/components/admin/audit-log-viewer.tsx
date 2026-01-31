'use client';

import { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        entity: '',
        limit: '100',
    });

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.action) params.append('action', filters.action);
            if (filters.entity) params.append('entity', filters.entity);
            if (filters.limit) params.append('limit', filters.limit);

            const response = await fetch(
                `/api/analytics/audit-logs?${params}`,
                {
                    credentials: 'include',
                },
            );
            const data = await response.json();
            if (data.success) {
                setLogs(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const exportLogs = () => {
        const csv = [
            [
                'Date',
                'User ID',
                'Action',
                'Entity',
                'Entity ID',
                'IP Address',
            ].join(','),
            ...logs.map((log) =>
                [
                    format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                    log.userId,
                    log.action,
                    log.entity,
                    log.entityId || '',
                    log.ipAddress || '',
                ]
                    .map((cell) => `"${cell}"`)
                    .join(','),
            ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getActionBadge = (action: string) => {
        const colors: any = {
            CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            VIEW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
            LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        };

        return (
            <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${colors[action] || colors.VIEW}`}
            >
                {action}
            </span>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Audit Logs</CardTitle>
                        <CardDescription>
                            System activity and security logs
                        </CardDescription>
                    </div>
                    <Button
                        onClick={exportLogs}
                        variant="outline"
                        disabled={logs.length === 0}
                    >
                        <Download className=" h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <Select
                        value={filters.action}
                        onValueChange={(value) =>
                            setFilters({ ...filters, action: value })
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Actions</SelectItem>
                            <SelectItem value="CREATE">Create</SelectItem>
                            <SelectItem value="UPDATE">Update</SelectItem>
                            <SelectItem value="DELETE">Delete</SelectItem>
                            <SelectItem value="VIEW">View</SelectItem>
                            <SelectItem value="LOGIN">Login</SelectItem>
                            <SelectItem value="LOGOUT">Logout</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.entity}
                        onValueChange={(value) =>
                            setFilters({ ...filters, entity: value })
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Entities" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Entities</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                            <SelectItem value="User">User</SelectItem>
                            <SelectItem value="Invitation">
                                Invitation
                            </SelectItem>
                            <SelectItem value="Salary">Salary</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.limit}
                        onValueChange={(value) =>
                            setFilters({ ...filters, limit: value })
                        }
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="50">50 logs</SelectItem>
                            <SelectItem value="100">100 logs</SelectItem>
                            <SelectItem value="200">200 logs</SelectItem>
                            <SelectItem value="500">500 logs</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground"
                                        >
                                            No audit logs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log._id}>
                                            <TableCell className="font-medium">
                                                {format(
                                                    new Date(log.createdAt),
                                                    'MMM dd, yyyy HH:mm:ss',
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getActionBadge(log.action)}
                                            </TableCell>
                                            <TableCell>{log.entity}</TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {log.userId}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {log.ipAddress || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {log.details
                                                    ? JSON.stringify(
                                                          log.details,
                                                      ).substring(0, 50) + '...'
                                                    : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
