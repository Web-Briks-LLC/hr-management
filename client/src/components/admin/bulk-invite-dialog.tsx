'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Download, Loader, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parse } from 'papaparse';

export default function BulkInviteDialog() {
    const [open, setOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<any>(null);

    const downloadTemplate = () => {
        const template = `email,designation,department,role,salary,branchId,shiftId,expiryHours
john@example.com,Software Developer,IT,staff,50000,BRANCH_ID_HERE,,48
jane@example.com,Team Leader,HR,team_leader,60000,BRANCH_ID_HERE,SHIFT_ID_HERE,72`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-invitation-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            const text = await file.text();
            const parsed = parse(text, { header: true, skipEmptyLines: true });

            if (parsed.errors.length > 0) {
                throw new Error('Invalid CSV format');
            }

            const invitations = parsed.data.map((row: any) => ({
                email: row.email,
                designation: row.designation,
                department: row.department || undefined,
                role: row.role,
                salary: Number(row.salary),
                branchId: row.branchId,
                shiftId: row.shiftId || undefined,
                expiryHours: Number(row.expiryHours) || 48,
            }));

            const response = await fetch('/api/invitations/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ invitations }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to send invitations');
            }

            setResults(data.data);
            toast.success(data.message);
        } catch (err: any) {
            toast.error(err.message || 'Failed to process file');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className=" h-4 w-4" />
                    Bulk Invite
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bulk Employee Invitation</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to send multiple invitations at once
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">
                                        Step 1: Download Template
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Download the CSV template and fill in
                                        employee details
                                    </p>
                                </div>
                                <Button
                                    onClick={downloadTemplate}
                                    variant="outline"
                                >
                                    <Download className=" h-4 w-4" />
                                    Download
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">
                                        Step 2: Upload CSV
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Upload the filled CSV file to send
                                        invitations
                                    </p>
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label htmlFor="csv-upload">
                                        <Button asChild disabled={isUploading}>
                                            <span>
                                                {isUploading ? (
                                                    <>
                                                        <Loader className=" h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className=" h-4 w-4" />
                                                        Upload CSV
                                                    </>
                                                )}
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {results && (
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="font-semibold mb-4">
                                    Upload Results
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>
                                            {results.success.length} invitations
                                            sent successfully
                                        </span>
                                    </div>
                                    {results.failed.length > 0 && (
                                        <div className="flex items-center gap-2 text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            <span>
                                                {results.failed.length}{' '}
                                                invitations failed
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {results.failed.length > 0 && (
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                                        <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                                            Failed Invitations:
                                        </p>
                                        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                            {results.failed.map(
                                                (fail: any, idx: number) => (
                                                    <li key={idx}>
                                                        {fail.email}:{' '}
                                                        {fail.error}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
