'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Trash2, Landmark, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useGetPayrollBankSettingsQuery,
    useUpdatePayrollBankSettingMutation,
    useDeletePayrollBankSettingMutation,
    type PayrollBankSetting,
} from '@/redux/features/payroll/payrollBankSettingsApi';
import CreatePayrollBankSettingDialog from './create-payroll-bank-setting-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PayrollBankSettingsTab() {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSetting, setSelectedSetting] = useState<PayrollBankSetting | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading } = useGetPayrollBankSettingsQuery();
    const settings: PayrollBankSetting[] = data?.data || [];

    const [updateSetting] = useUpdatePayrollBankSettingMutation();
    const [deleteSetting, { isLoading: isDeleting }] = useDeletePayrollBankSettingMutation();

    const filteredSettings = settings.filter((s) =>
        s.bankName.toLowerCase().includes(search.toLowerCase()) ||
        s.companyName.toLowerCase().includes(search.toLowerCase()) ||
        s.bankAccountNo.toLowerCase().includes(search.toLowerCase())
    );

    const handleSetDefault = async (setting: PayrollBankSetting) => {
        if (setting.isDefault) return;
        try {
            await updateSetting({
                id: setting._id,
                data: { isDefault: true },
            }).unwrap();
            toast.success('Default bank account updated');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update default');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteSetting(deleteId).unwrap();
            toast.success('Bank account deleted successfully');
            setDeleteId(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete bank account');
        }
    };

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search bank accounts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Button
                    onClick={() => {
                        setSelectedSetting(null);
                        setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                </Button>
            </div>

            {/* Bank Account List */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[250px]">
                    <Spinner />
                </div>
            ) : filteredSettings.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-muted/20">
                    <Landmark className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-lg">No bank accounts found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                        {search ? 'Try adjusting your search query.' : 'Get started by adding your first payroll bank account.'}
                    </p>
                    {!search && (
                        <Button
                            onClick={() => {
                                setSelectedSetting(null);
                                setDialogOpen(true);
                            }}
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Bank Account
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSettings.map((setting) => (
                        <div
                            key={setting._id}
                            className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all"
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-base tracking-tight">
                                            {setting.bankName}
                                        </h4>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {setting.bankAccountNo}
                                        </p>
                                    </div>
                                    {setting.isDefault && (
                                        <Badge className="gap-1">
                                            <Star className="h-3 w-3" />
                                            Default
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {setting.companyName}
                                    {setting.branchName && ` · ${setting.branchName}`}
                                    {setting.branchLocation && ` (${setting.branchLocation})`}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-4 border-t text-xs">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    disabled={setting.isDefault}
                                    onClick={() => handleSetDefault(setting)}
                                >
                                    {setting.isDefault ? 'Default' : 'Set as Default'}
                                </Button>

                                <div className="flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            setSelectedSetting(setting);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                    </Button>

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(setting._id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <CreatePayrollBankSettingDialog
                open={dialogOpen}
                setOpen={setDialogOpen}
                editSetting={selectedSetting}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this payroll bank account. It will no longer be selectable when exporting payroll documents.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Spinner /> : 'Delete Bank Account'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
