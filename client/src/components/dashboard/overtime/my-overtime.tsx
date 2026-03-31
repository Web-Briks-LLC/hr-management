'use client';

import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useGetMyOvertimeQuery } from '@/redux/features/overtime/overtimeApi';
import { IOvertime } from '@/types/overtime.type';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OvertimeCountdownWidget from './overtime-countdown-widget';

export default function MyOvertime() {
    const { data: overtimeData, isLoading } = useGetMyOvertimeQuery({});

    if (isLoading) return <div>Loading your overtime records...</div>;

    const records = (overtimeData?.data as IOvertime[]) || [];

    return (
        <div className="space-y-6">
            <OvertimeCountdownWidget />

            <Card>
                <CardHeader>
                <CardTitle>My Overtime History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Start Time</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Creator</TableHead>
                                <TableHead className="text-right">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-4"
                                    >
                                        No overtime records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((ot) => (
                                    <TableRow key={ot._id}>
                                        <TableCell>
                                            {format(
                                                new Date(ot.date),
                                                'PPP'
                                            )}
                                        </TableCell>
                                        <TableCell className="capitalize">
                                            {ot.type.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell>
                                            {format(
                                                new Date(ot.startTime),
                                                'hh:mm aa'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {Math.floor(
                                                ot.durationMinutes / 60
                                            )}
                                            h {ot.durationMinutes % 60}m
                                        </TableCell>
                                        <TableCell>
                                            {ot.createdBy?.name || 'System'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant={
                                                    ot.status === 'approved'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {ot.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        </div>
    );
}
