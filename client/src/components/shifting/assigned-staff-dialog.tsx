"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, User, Building2 } from "lucide-react";
import { useGetStaffsQuery } from "@/redux/features/staff/staffApi";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface IStaffResponse {
    _id: string;
    staffId: string;
    designation: string;
    department?: string;
    user?: {
        name?: string;
        image?: string;
    };
}

interface AssignedStaffDialogProps {
    shiftId: string;
    shiftName: string;
}

export default function AssignedStaffDialog({
    shiftId,
    shiftName,
}: AssignedStaffDialogProps) {
    const [open, setOpen] = useState(false);

    // Fetch staff only when dialog is open
    const { data: staffData, isLoading } = useGetStaffsQuery(
        { shiftId, limit: 100 }, // Fetch up to 100 staff assigned to this shift
        { skip: !open },
    );

    const staffs = staffData?.staffs || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Assigned Staff</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Assigned to {shiftName}
                    </DialogTitle>
                    <DialogDescription>
                        A list of staff members currently operating under this
                        shift.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[300px] w-full pr-4 mt-2">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 border rounded-lg"
                                >
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : staffs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                            <Users className="h-12 w-12 mb-3 text-muted-foreground/50" />
                            <p className="font-medium">No staff assigned</p>
                            <p className="text-sm text-balance mt-1">
                                There are currently no active staff members
                                assigned to this shift.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {staffs.map((staff: IStaffResponse) => (
                                <div
                                    key={staff._id}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border shadow-sm">
                                            <AvatarImage
                                                src={staff.user?.image || ""}
                                                alt={
                                                    staff.user?.name || "Staff"
                                                }
                                            />
                                            <AvatarFallback className="bg-primary/10 text-primary uppercase">
                                                {staff.user?.name?.substring(
                                                    0,
                                                    2,
                                                ) || "ST"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium leading-none">
                                                    {staff.user?.name ||
                                                        "Unknown"}
                                                </p>
                                                <Badge
                                                    variant="secondary"
                                                    className="font-mono text-[10px] px-1 py-0 h-[18px]"
                                                >
                                                    {staff.staffId}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground leading-none">
                                                    <User className="h-3 w-3" />
                                                    {staff.designation}
                                                </div>
                                                {staff.department && (
                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground leading-none">
                                                        <Building2 className="h-3 w-3" />
                                                        {staff.department}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
