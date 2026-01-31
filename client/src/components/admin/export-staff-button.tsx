'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportStaffButton() {
    const handleExport = async () => {
        try {
            const response = await fetch('/api/staffs/export', {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to export staff data');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `staff-export-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Staff data exported successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to export data');
        }
    };

    return (
        <Button onClick={handleExport} variant="outline">
            <Download className=" h-4 w-4" />
            Export to CSV
        </Button>
    );
}
