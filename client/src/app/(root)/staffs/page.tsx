'use client';

import { useState } from 'react';
import { useGetStaffsQuery } from '@/redux/features/staff/staffApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Eye, User } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
    present: 'bg-green-500',
    absent: 'bg-red-500',
    late: 'bg-yellow-500',
    half_day: 'bg-orange-500',
    early_exit: 'bg-purple-500',
    on_leave: 'bg-blue-500',
    weekend: 'bg-gray-500',
    holiday: 'bg-pink-500',
};

const statusLabels: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    half_day: 'Half Day',
    early_exit: 'Early Exit',
    on_leave: 'On Leave',
    weekend: 'Weekend',
    holiday: 'Holiday',
};

interface Staff {
    _id: string;
    staffId: string;
    phone: string;
    department: string;
    designation: string;
    joinDate: string;
    status: string;
    profileCompleted: boolean;
    user?: {
        _id: string;
        name: string;
        email: string;
        image?: string;
        role: string;
    };
    branch?: {
        _id: string;
        name: string;
    };
    todayAttendance?: {
        status: string;
        checkInAt?: string;
        checkOutAt?: string;
        lateMinutes?: number;
    };
    currentShift?: {
        name: string;
        startTime: string;
        endTime: string;
    };
}

export default function StaffsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const { data, isLoading } = useGetStaffsQuery({});

    const staffs: Staff[] = data?.staffs || [];

    // Filter staffs based on search query
    const filteredStaffs = staffs.filter((staff) => {
        const query = searchQuery.toLowerCase();
        return (
            staff.user?.name?.toLowerCase().includes(query) ||
            staff.staffId?.toLowerCase().includes(query) ||
            staff.department?.toLowerCase().includes(query) ||
            staff.designation?.toLowerCase().includes(query) ||
            staff.user?.email?.toLowerCase().includes(query)
        );
    });

    const handleViewDetails = (staff: Staff) => {
        setSelectedStaff(staff);
        setIsDetailOpen(true);
    };

    const getStatusBadge = (status?: string) => {
        if (!status) {
            return <Badge variant="outline">No Record</Badge>;
        }
        return (
            <Badge className={`${statusColors[status] || 'bg-gray-400'} text-white`}>
                {statusLabels[status] || status}
            </Badge>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Staff Management</CardTitle>
                            <CardDescription>
                                View all staff members and their attendance status
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff</TableHead>
                                        <TableHead>Staff ID</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Shift</TableHead>
                                        <TableHead>Today Status</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStaffs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No staff members found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStaffs.map((staff) => (
                                            <TableRow key={staff._id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={staff.user?.image || ''} />
                                                            <AvatarFallback>
                                                                <User className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{staff.user?.name || 'N/A'}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {staff.user?.email || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono">{staff.staffId}</TableCell>
                                                <TableCell>{staff.department || 'N/A'}</TableCell>
                                                <TableCell>{staff.designation || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {staff.currentShift ? (
                                                        <span className="text-sm">
                                                            {staff.currentShift.name}
                                                            <br />
                                                            <span className="text-muted-foreground">
                                                                {staff.currentShift.startTime} - {staff.currentShift.endTime}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">No Shift</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(staff.todayAttendance?.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(staff)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Staff Details Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Staff Details</DialogTitle>
                        <DialogDescription>
                            Complete information about the staff member
                        </DialogDescription>
                    </DialogHeader>
                    {selectedStaff && (
                        <div className="space-y-6">
                            {/* Profile Section */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={selectedStaff.user?.image || ''} />
                                    <AvatarFallback>
                                        <User className="h-8 w-8" />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-semibold">{selectedStaff.user?.name || 'N/A'}</h3>
                                    <p className="text-muted-foreground">{selectedStaff.user?.email}</p>
                                    <Badge variant="outline" className="mt-1">
                                        {selectedStaff.user?.role}
                                    </Badge>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Staff ID</p>
                                    <p className="font-medium">{selectedStaff.staffId}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Phone</p>
                                    <p className="font-medium">{selectedStaff.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Department</p>
                                    <p className="font-medium">{selectedStaff.department || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Designation</p>
                                    <p className="font-medium">{selectedStaff.designation || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Branch</p>
                                    <p className="font-medium">{selectedStaff.branch?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Join Date</p>
                                    <p className="font-medium">
                                        {selectedStaff.joinDate
                                            ? format(new Date(selectedStaff.joinDate), 'PPP')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Employment Status</p>
                                    <Badge variant={selectedStaff.status === 'active' ? 'default' : 'destructive'}>
                                        {selectedStaff.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Profile Completed</p>
                                    <Badge variant={selectedStaff.profileCompleted ? 'default' : 'outline'}>
                                        {selectedStaff.profileCompleted ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Today's Attendance */}
                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">Today&apos;s Attendance</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Status</p>
                                        {getStatusBadge(selectedStaff.todayAttendance?.status)}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Current Shift</p>
                                        <p className="font-medium">
                                            {selectedStaff.currentShift
                                                ? `${selectedStaff.currentShift.name} (${selectedStaff.currentShift.startTime} - ${selectedStaff.currentShift.endTime})`
                                                : 'No Shift Assigned'}
                                        </p>
                                    </div>
                                    {selectedStaff.todayAttendance?.checkInAt && (
                                        <div>
                                            <p className="text-muted-foreground">Check In</p>
                                            <p className="font-medium">
                                                {format(new Date(selectedStaff.todayAttendance.checkInAt), 'hh:mm aa')}
                                            </p>
                                        </div>
                                    )}
                                    {selectedStaff.todayAttendance?.checkOutAt && (
                                        <div>
                                            <p className="text-muted-foreground">Check Out</p>
                                            <p className="font-medium">
                                                {format(new Date(selectedStaff.todayAttendance.checkOutAt), 'hh:mm aa')}
                                            </p>
                                        </div>
                                    )}
                                    {(selectedStaff.todayAttendance?.lateMinutes ?? 0) > 0 && (
                                        <div>
                                            <p className="text-muted-foreground">Late By</p>
                                            <p className="font-medium text-yellow-600">
                                                {selectedStaff.todayAttendance?.lateMinutes} minutes
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
