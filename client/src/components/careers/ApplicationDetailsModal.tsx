'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
    X,
    Download,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    ExternalLink,
    CheckCircle,
    Loader,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUpdateApplicationStatusMutation } from '@/redux/features/career/careerApi';
import type { IJobApplication, ApplicationStatus } from '@/types/career.type';
import {
    APPLICATION_STATUS_LABELS,
    APPLICATION_STATUS_COLORS,
} from '@/types/career.type';
import { toast } from 'sonner';

interface ApplicationDetailsModalProps {
    application: IJobApplication;
    onClose: () => void;
}

export function ApplicationDetailsModal({
    application,
    onClose,
}: ApplicationDetailsModalProps) {
    const [updateStatus, { isLoading }] = useUpdateApplicationStatusMutation();
    const [status, setStatus] = useState<ApplicationStatus>(application.status);
    const [notes, setNotes] = useState(application.notes || '');

    const handleStatusUpdate = async () => {
        try {
            await updateStatus({
                id: application._id,
                status,
                notes: notes || undefined,
            }).unwrap();
            toast.success('Status updated successfully');
            onClose();
        } catch {
            toast.error('Failed to update status');
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Application Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Applicant Info */}
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                        <h3 className="font-semibold text-lg">
                            {application.firstName} {application.lastName}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`mailto:${application.email}`}
                                    className="text-primary hover:underline"
                                >
                                    {application.email}
                                </a>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`tel:${application.phone}`}
                                    className="hover:underline"
                                >
                                    {application.phone}
                                </a>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {application.facebook && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={application.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Facebook{' '}
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                            )}
                            {application.linkedin && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={application.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        LinkedIn{' '}
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                            )}
                            {application.portfolio && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={application.portfolio}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Portfolio{' '}
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Position Info */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">
                            Applied For
                        </Label>
                        <div className="p-3 border rounded-lg">
                            <div className="font-medium">
                                {application.jobPosition?.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {application.jobPosition?.company}
                            </div>
                            {application.jobPosition?.location && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {application.jobPosition.location}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">
                            Experience Level
                        </Label>
                        <Badge
                            variant="outline"
                            className="text-base py-1 px-3"
                        >
                            {application.hasExperience
                                ? '✅ Experienced'
                                : '🆕 Fresher'}
                        </Badge>
                    </div>

                    {/* Work Experience Details */}
                    {application.hasExperience &&
                        application.experiences &&
                        application.experiences.length > 0 && (
                            <div className="space-y-3">
                                <Label className="text-muted-foreground">
                                    Work Experience
                                </Label>
                                {application.experiences.map((exp, index) => (
                                    <div
                                        key={index}
                                        className="p-3 border rounded-lg space-y-1"
                                    >
                                        <div className="font-medium">
                                            {exp.position}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {exp.company}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {format(
                                                new Date(exp.startDate),
                                                'MMM yyyy',
                                            )}{' '}
                                            -{' '}
                                            {exp.isCurrent
                                                ? 'Present'
                                                : exp.endDate
                                                  ? format(
                                                        new Date(exp.endDate),
                                                        'MMM yyyy',
                                                    )
                                                  : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    {/* Cover Letter */}
                    {application.coverLetter && (
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">
                                Cover Letter
                            </Label>
                            <div className="p-3 border rounded-lg text-sm whitespace-pre-wrap">
                                {application.coverLetter}
                            </div>
                        </div>
                    )}

                    {/* CV Download */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">
                            Resume/CV
                        </Label>
                        <Button variant="outline" className="w-full" asChild>
                            <a
                                href={application.cvFile?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Download className="h-4 w-4 " />
                                Download CV ({application.cvFile?.fileName})
                            </a>
                        </Button>
                    </div>

                    {/* Application Date */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Applied on{' '}
                        {format(
                            new Date(application.createdAt),
                            'MMMM dd, yyyy hh:mm a',
                        )}
                    </div>

                    {/* Status Update Section */}
                    <div className="border-t pt-6 space-y-4">
                        <h4 className="font-semibold">Update Status</h4>

                        <div className="flex items-center gap-3">
                            <Label className="min-w-[80px]">Current:</Label>
                            <Badge
                                className={
                                    APPLICATION_STATUS_COLORS[
                                        application.status
                                    ]
                                }
                            >
                                {APPLICATION_STATUS_LABELS[application.status]}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">New Status</Label>
                            <Select
                                value={status}
                                onValueChange={(val) =>
                                    setStatus(val as ApplicationStatus)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">
                                        Pending
                                    </SelectItem>
                                    <SelectItem value="reviewed">
                                        Reviewed
                                    </SelectItem>
                                    <SelectItem value="shortlisted">
                                        Shortlisted
                                    </SelectItem>
                                    <SelectItem value="rejected">
                                        Rejected
                                    </SelectItem>
                                    <SelectItem value="hired">Hired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes about this application..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            onClick={handleStatusUpdate}
                            disabled={
                                isLoading || status === application.status
                            }
                        >
                            {isLoading ? (
                                <Loader className="h-4 w-4  animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4 " />
                            )}
                            Update Status
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
