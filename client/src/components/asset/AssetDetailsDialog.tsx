'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Edit,
    Trash2,
    Laptop,
    Armchair,
    Coffee,
    Tv,
    FileText,
    Key,
    Car,
    Box,
    DollarSign,
    Calendar,
    MapPin,
    Building2,
    Shield,
    Sparkles,
    UserCheck,
    FileCheck2,
    Clock,
    X,
} from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import type { IAsset, AssetCategory } from '@/types/asset.type';
import {
    ASSET_CATEGORIES,
    ASSET_STATUS_CONFIG,
    ASSET_CONDITION_CONFIG,
} from '@/types/asset.type';

// Safe Local Date Helpers (Timezone-agnostic, prevents 1-day offset)
const parseLocalDate = (dateStr?: string | null): Date | undefined => {
    if (!dateStr) return undefined;
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parsed = parse(clean, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : undefined;
};

const formatDisplayDate = (dateStr?: string | null, formatStr: string = 'PPP'): string => {
    const d = parseLocalDate(dateStr);
    return d ? format(d, formatStr) : 'Not specified';
};

interface AssetDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: IAsset | null;
    onEdit?: (asset: IAsset) => void;
    onDelete?: (asset: IAsset) => void;
}

const CATEGORY_ICONS: Record<AssetCategory, any> = {
    electronics_it: Laptop,
    furniture_fixture: Armchair,
    office_supplies_pantry: Coffee,
    appliances_facilities: Tv,
    documents_legal: FileText,
    software_licenses: Key,
    vehicles_machinery: Car,
    other: Box,
};

export function AssetDetailsDialog({
    open,
    onOpenChange,
    asset,
    onEdit,
    onDelete,
}: AssetDetailsDialogProps) {
    if (!asset) return null;

    const categoryInfo = ASSET_CATEGORIES.find((c) => c.id === asset.category);
    const CatIcon = CATEGORY_ICONS[asset.category] || Box;
    const statusConfig = ASSET_STATUS_CONFIG[asset.status] || ASSET_STATUS_CONFIG.in_use;
    const conditionConfig = ASSET_CONDITION_CONFIG[asset.condition] || ASSET_CONDITION_CONFIG.new;

    const specsEntries = Object.entries(asset.specifications || {});

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-w-4xl max-h-[80vh] h-[80vh] p-0 overflow-hidden flex flex-col gap-0 border-border/60 shadow-2xl">
                {/* Header Banner */}
                <DialogHeader className="p-5 md:px-7 border-b bg-muted/20 shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <CatIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                                        {asset.assetTag}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={`text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                                    >
                                        {statusConfig.label}
                                    </Badge>
                                    <span
                                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${conditionConfig.bg} ${conditionConfig.text}`}
                                    >
                                        {conditionConfig.label} Condition
                                    </span>
                                </div>
                                <DialogTitle className="text-xl font-bold text-foreground mt-1.5">
                                    {asset.name}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {categoryInfo?.label || 'Asset'}
                                    {asset.subCategory ? ` • ${asset.subCategory}` : ''}
                                    {asset.modelNumber ? ` • Model: ${asset.modelNumber}` : ''}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Details Scroll Area (Matches Form Dialog scroll styling) */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 md:p-8 space-y-6">
                        {/* Financial & Stock Overview Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Quantity
                                </p>
                                <p className="text-base font-bold text-foreground">
                                    {asset.quantity} {asset.unit}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Unit Purchase Price
                                </p>
                                <p className="text-base font-bold text-foreground">
                                    {asset.currency} {(asset.purchasePrice || 0).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Total Value
                                </p>
                                <p className="text-base font-bold text-primary">
                                    {asset.currency} {(asset.totalCost || 0).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Acquisition Date
                                </p>
                                <p className="text-xs font-semibold text-foreground mt-1">
                                    {formatDisplayDate(asset.purchaseDate, 'MMM dd, yyyy')}
                                </p>
                            </div>
                        </div>

                        {/* Location, Branch & Staff Assignment */}
                        <div className="rounded-xl border bg-card p-5 space-y-3.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-primary" /> Location & Assignment
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground font-medium">Assigned Custodian:</span>
                                    {asset.assignedTo && (asset.assignedTo.name || asset.assignedTo.designation) ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Avatar className="h-7 w-7 border">
                                                <AvatarImage src={asset.assignedTo.avatar} />
                                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                                    {((asset.assignedTo.name || asset.assignedTo.designation || 'ST').slice(0, 2)).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-foreground">
                                                    {asset.assignedTo.name || asset.assignedTo.designation}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {asset.assignedTo.designation && asset.assignedTo.name
                                                        ? asset.assignedTo.designation
                                                        : asset.assignedDepartment || asset.assignedTo.email || ''}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-medium text-foreground mt-1">General Office / Unassigned</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <span className="text-muted-foreground font-medium">Branch Location:</span>
                                    <p className="font-medium text-foreground flex items-center gap-1.5 mt-1">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        {asset.branchId?.name
                                            ? `${asset.branchId.name} (${asset.branchId.code})`
                                            : 'Head Office / Global'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-muted-foreground font-medium">Room / Desk:</span>
                                    <p className="font-medium text-foreground flex items-center gap-1.5 mt-1">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        {asset.location || 'Not specified'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-muted-foreground font-medium">Handover Date:</span>
                                    <p className="font-medium text-foreground flex items-center gap-1.5 mt-1">
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                        {formatDisplayDate(asset.assignedDate, 'MMM dd, yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Specifications & Hardware / Document Details */}
                        {specsEntries.length > 0 && (
                            <div className="rounded-xl border bg-card p-5 space-y-3.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" /> Specifications & Attributes
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {specsEntries.map(([key, val]) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-xs"
                                        >
                                            <span className="text-muted-foreground capitalize font-medium">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="font-semibold text-foreground text-right pl-2 truncate max-w-[160px]">
                                                {String(val)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hardware Identifiers, Vendor & Warranty */}
                        <div className="rounded-xl border bg-card p-5 space-y-3.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" /> Identifiers, Vendor & Warranty
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                {asset.serialNumber && (
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground font-medium">Serial Number (S/N):</span>
                                        <p className="font-mono font-semibold text-foreground break-all">{asset.serialNumber}</p>
                                    </div>
                                )}
                                {asset.modelNumber && (
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground font-medium">Model / Version:</span>
                                        <p className="font-semibold text-foreground">{asset.modelNumber}</p>
                                    </div>
                                )}
                                {asset.vendor && (
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground font-medium">Vendor / Supplier:</span>
                                        <p className="font-medium text-foreground">{asset.vendor}</p>
                                    </div>
                                )}
                                {asset.invoiceNumber && (
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground font-medium">Invoice Reference:</span>
                                        <p className="font-medium text-foreground">{asset.invoiceNumber}</p>
                                    </div>
                                )}
                                {asset.warrantyExpiry && (
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground font-medium">Warranty Expiry:</span>
                                        <p className="font-semibold text-foreground">
                                            {formatDisplayDate(asset.warrantyExpiry, 'MMM dd, yyyy')}
                                        </p>
                                    </div>
                                )}
                                {asset.expiryDate && (
                                    <div className="space-y-0.5">
                                        <span className="text-muted-foreground font-medium">License / Document Expiry:</span>
                                        <p className="font-semibold text-foreground">
                                            {formatDisplayDate(asset.expiryDate, 'MMM dd, yyyy')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        {asset.notes && (
                            <div className="rounded-xl border bg-card p-5 space-y-2 text-xs">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <FileCheck2 className="h-4 w-4 text-primary" /> Notes & Remarks
                                </span>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{asset.notes}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Dialog Footer */}
                <DialogFooter className="p-4 px-5 md:px-7 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-3 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="h-9 px-4 text-xs font-medium"
                    >
                        Close
                    </Button>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onOpenChange(false);
                                    onEdit(asset);
                                }}
                                className="h-9 px-4 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                            >
                                <Edit className="h-3.5 w-3.5" /> Edit Asset
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onOpenChange(false);
                                    onDelete(asset);
                                }}
                                className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
