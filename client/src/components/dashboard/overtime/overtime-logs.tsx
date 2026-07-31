'use client';

import { useGetOvertimeLogsQuery } from '@/redux/features/overtime/overtimeApi';
import { format } from 'date-fns';
import { Clock, Plus, Trash, Edit, CheckCircle2, XCircle, User, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getActionIcon = (action: string) => {
    switch (action) {
        case 'OVERTIME_CREATE':
            return <Plus className="h-4 w-4 text-emerald-500" />;
        case 'OVERTIME_UPDATE':
            return <Edit className="h-4 w-4 text-blue-500" />;
        case 'OVERTIME_STATUS_CHANGE':
            return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
        case 'OVERTIME_DELETE':
            return <Trash className="h-4 w-4 text-red-500" />;
        case 'OVERTIME_EXTEND':
            return <Clock className="h-4 w-4 text-orange-500" />;
        default:
            return <Edit className="h-4 w-4 text-muted-foreground" />;
    }
};

const formatActionText = (action: string) => {
    switch (action) {
        case 'OVERTIME_CREATE': return 'created a new overtime record';
        case 'OVERTIME_UPDATE': return 'updated an overtime record';
        case 'OVERTIME_STATUS_CHANGE': return 'changed overtime status';
        case 'OVERTIME_DELETE': return 'deleted an overtime record';
        case 'OVERTIME_EXTEND': return 'extended an overtime session';
        default: return 'modified an overtime record';
    }
};

export default function OvertimeLogs() {
    const { data: logsData, isLoading, isError } = useGetOvertimeLogsQuery(undefined, { pollingInterval: 15000 });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return <div className="text-destructive p-4 border rounded-md">Failed to load audit logs.</div>;
    }

    const logs = logsData?.data || [];

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 border rounded-xl border-dashed">
                <Clock className="h-8 w-8 opacity-40" />
                <h3 className="text-xl font-semibold text-foreground">No logs found</h3>
                <p className="text-sm">Overtime changes will appear here.</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {logs.map((log: any) => {
                const adminName = log.userId?.name || 'Unknown User';
                const staffName = log.entityId?.staffId?.userId?.name || log.details?.deletedRecord?.staffId?.name || 'a staff member';
                
                return (
                    <div key={log._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                            {getActionIcon(log.action)}
                        </div>
                        
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={log.userId?.image || ''} />
                                    <AvatarFallback className="text-[10px]"><User className="h-3 w-3" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-sm">
                                    <span className="font-semibold text-foreground">{adminName}</span>
                                    <span className="text-muted-foreground"> {formatActionText(log.action)} for </span>
                                    <span className="font-medium text-foreground">{staffName}</span>
                                </div>
                            </div>

                            {/* Details rendering based on action */}
                            {log.details && Object.keys(log.details).length > 0 && (
                                <div className="mt-3 bg-muted/30 rounded-md p-3 text-sm border space-y-2">
                                    {log.details.status && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-16">Status:</span>
                                            <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{log.details.status.old}</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{log.details.status.new}</span>
                                        </div>
                                    )}
                                    {log.details.durationMinutes && typeof log.details.durationMinutes === 'object' && log.details.durationMinutes.old !== undefined && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-16">Duration:</span>
                                            <span className="font-medium">{log.details.durationMinutes.old}m</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{log.details.durationMinutes.new}m</span>
                                        </div>
                                    )}
                                    {log.action === 'OVERTIME_CREATE' && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <span>Created {log.details.durationMinutes || 0}m overtime ({log.details.type})</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
