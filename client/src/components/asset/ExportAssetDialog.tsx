'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader, Download, FileSpreadsheet } from 'lucide-react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useGetAssetsQuery } from '@/redux/features/asset/assetApi';
import type { AssetCategory, AssetStatus } from '@/types/asset.type';
import { ASSET_CATEGORIES } from '@/types/asset.type';

interface ExportAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ExportAssetDialog({
    open,
    onOpenChange,
}: ExportAssetDialogProps) {
    const [category, setCategory] = useState<AssetCategory | 'all'>('all');
    const [status, setStatus] = useState<AssetStatus | 'all'>('all');
    const [formatType, setFormatType] = useState<'xlsx' | 'csv'>('xlsx');
    const [isExporting, setIsExporting] = useState(false);

    // Fetch matching data for export (limit: 1000 items)
    const { data: assetsData, isFetching } = useGetAssetsQuery(
        {
            limit: 1000,
            category: category !== 'all' ? category : undefined,
            status: status !== 'all' ? status : undefined,
        },
        { skip: !open },
    );

    const handleExport = () => {
        try {
            setIsExporting(true);
            const assets = assetsData?.data || [];

            if (assets.length === 0) {
                toast.error('No assets found to export with selected filters.');
                setIsExporting(false);
                return;
            }

            const exportData = assets.map((a, idx) => {
                const specsSummary = a.specifications
                    ? Object.entries(a.specifications)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                    : '';

                return {
                    'SL No': idx + 1,
                    'Asset Tag': a.assetTag,
                    'Asset Name': a.name,
                    'Category': ASSET_CATEGORIES.find((c) => c.id === a.category)?.label || a.category,
                    'Sub-Category / Type': a.subCategory || '',
                    'Quantity': a.quantity,
                    'Unit': a.unit,
                    'Unit Price': a.purchasePrice,
                    'Total Cost': a.totalCost,
                    'Currency': a.currency,
                    'Current Value': a.currentValue || '',
                    'Status': a.status.toUpperCase(),
                    'Condition': a.condition.toUpperCase(),
                    'Assigned To': a.assignedTo?.name || 'Unassigned',
                    'Department': a.assignedDepartment || a.assignedTo?.department || '',
                    'Location': a.location || '',
                    'Branch': a.branchId?.name || 'Head Office',
                    'Vendor / Supplier': a.vendor || '',
                    'Serial Number': a.serialNumber || '',
                    'Model Number': a.modelNumber || '',
                    'Specifications': specsSummary,
                    'Purchase Date': a.purchaseDate ? format(new Date(a.purchaseDate), 'yyyy-MM-dd') : '',
                    'Warranty Expiry': a.warrantyExpiry ? format(new Date(a.warrantyExpiry), 'yyyy-MM-dd') : '',
                    'License Expiry': a.expiryDate ? format(new Date(a.expiryDate), 'yyyy-MM-dd') : '',
                    'Notes': a.notes || '',
                    'Created At': format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm'),
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Assets');

            const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
            const fileName = `Company_Assets_Report_${timestamp}.${formatType}`;

            if (formatType === 'csv') {
                const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
                const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
                saveAs(blob, fileName);
            } else {
                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
                saveAs(blob, fileName);
            }

            toast.success(`Successfully exported ${assets.length} assets!`);
            onOpenChange(false);
        } catch (err: any) {
            console.error('Export error:', err);
            toast.error('Failed to generate export file');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Export Asset Inventory
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Download a complete spreadsheet of company assets for audits and financial accounting.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Category Filter */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Filter by Category</Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {ASSET_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Filter by Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="in_use">In Use</SelectItem>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Format Selector */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Export Format</Label>
                        <Select value={formatType} onValueChange={(v) => setFormatType(v as any)}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xlsx">Excel Workbook (.xlsx)</SelectItem>
                                <SelectItem value="csv">Comma Separated Values (.csv)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleExport}
                        disabled={isExporting || isFetching}
                        className="text-xs gap-1.5 font-semibold"
                    >
                        {isExporting ? (
                            <Loader className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Download className="h-3.5 w-3.5" />
                        )}
                        Export Data
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
