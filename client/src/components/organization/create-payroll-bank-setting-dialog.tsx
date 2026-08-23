'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import {
    useCreatePayrollBankSettingMutation,
    useUpdatePayrollBankSettingMutation,
    type PayrollBankSetting,
} from '@/redux/features/payroll/payrollBankSettingsApi';

interface CreatePayrollBankSettingDialogProps {
    open: boolean;
    setOpen: (v: boolean) => void;
    editSetting?: PayrollBankSetting | null;
}

export default function CreatePayrollBankSettingDialog({
    open,
    setOpen,
    editSetting,
}: CreatePayrollBankSettingDialogProps) {
    const [bankName, setBankName] = useState('');
    const [bankAccountNo, setBankAccountNo] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [branchLocation, setBranchLocation] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const [createSetting, { isLoading: isCreating }] =
        useCreatePayrollBankSettingMutation();
    const [updateSetting, { isLoading: isUpdating }] =
        useUpdatePayrollBankSettingMutation();

    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (editSetting) {
            setBankName(editSetting.bankName || '');
            setBankAccountNo(editSetting.bankAccountNo || '');
            setCompanyName(editSetting.companyName || '');
            setBranchName(editSetting.branchName || '');
            setBranchLocation(editSetting.branchLocation || '');
            setIsDefault(editSetting.isDefault ?? false);
        } else {
            setBankName('');
            setBankAccountNo('');
            setCompanyName('');
            setBranchName('');
            setBranchLocation('');
            setIsDefault(false);
        }
    }, [editSetting, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankName.trim() || !bankAccountNo.trim() || !companyName.trim()) {
            toast.error('Bank name, account number and company name are required');
            return;
        }

        const payload = {
            bankName: bankName.trim(),
            bankAccountNo: bankAccountNo.trim(),
            companyName: companyName.trim(),
            branchName: branchName.trim(),
            branchLocation: branchLocation.trim(),
            isDefault,
        };

        try {
            if (editSetting) {
                await updateSetting({ id: editSetting._id, data: payload }).unwrap();
                toast.success('Bank account updated successfully');
            } else {
                await createSetting(payload).unwrap();
                toast.success('Bank account created successfully');
            }

            setOpen(false);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Action failed');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {editSetting ? 'Edit Bank Account' : 'Add New Bank Account'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="bank-name">Bank Name *</Label>
                        <Input
                            id="bank-name"
                            placeholder="e.g. Dutch-Bangla Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="bank-acc">Account Number *</Label>
                        <Input
                            id="bank-acc"
                            placeholder="e.g. 1234567890"
                            value={bankAccountNo}
                            onChange={(e) => setBankAccountNo(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="bank-company">Company Name *</Label>
                        <Input
                            id="bank-company"
                            placeholder="e.g. Acme Studio Ltd."
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="bank-branch">Branch Name</Label>
                            <Input
                                id="bank-branch"
                                placeholder="e.g. Gulshan"
                                value={branchName}
                                onChange={(e) => setBranchName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="bank-branch-loc">Branch Location</Label>
                            <Input
                                id="bank-branch-loc"
                                placeholder="e.g. Dhaka"
                                value={branchLocation}
                                onChange={(e) => setBranchLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="bank-default" className="cursor-pointer">
                            Set as Default
                        </Label>
                        <Switch
                            id="bank-default"
                            checked={isDefault}
                            onCheckedChange={setIsDefault}
                        />
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? <Spinner /> : editSetting ? 'Save Changes' : 'Add Bank Account'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
