'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Building2, FileText, Loader2, CloudCog } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    useGetPayrollBankSettingsQuery,
    useCreatePayrollBankSettingMutation,
    PayrollBankSetting,
} from '@/redux/features/payroll/payrollBankSettingsApi';

interface ExportPdfDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payrollData: any[];
    month: string; // Format: YYYY-MM
}

// Simple number to words conversion for BDT
function numberToWords(num: number): string {
    const ones = [
        '',
        'One',
        'Two',
        'Three',
        'Four',
        'Five',
        'Six',
        'Seven',
        'Eight',
        'Nine',
        'Ten',
        'Eleven',
        'Twelve',
        'Thirteen',
        'Fourteen',
        'Fifteen',
        'Sixteen',
        'Seventeen',
        'Eighteen',
        'Nineteen',
    ];
    const tens = [
        '',
        '',
        'Twenty',
        'Thirty',
        'Forty',
        'Fifty',
        'Sixty',
        'Seventy',
        'Eighty',
        'Ninety',
    ];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(-num);

    let words = '';

    if (Math.floor(num / 10000000) > 0) {
        words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
        num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
        words += numberToWords(Math.floor(num / 100000)) + ' Lac ';
        num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
        words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
        words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
        num %= 100;
    }
    if (num > 0) {
        if (num < 20) {
            words += ones[num];
        } else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) {
                words += ' ' + ones[num % 10];
            }
        }
    }

    return words.trim();
}

export default function ExportPdfDialog({
    open,
    onOpenChange,
    payrollData,
    month,
}: ExportPdfDialogProps) {
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);

    // New bank form fields
    const [newBankName, setNewBankName] = useState('');
    const [newAccountNo, setNewAccountNo] = useState('');
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchLocation, setNewBranchLocation] = useState('');

    const { data: bankSettingsData, isLoading: isLoadingSettings } =
        useGetPayrollBankSettingsQuery();
    const [createBankSetting, { isLoading: isCreating }] =
        useCreatePayrollBankSettingMutation();

    const bankSettings = bankSettingsData?.data || [];

    // Auto-select default or first bank setting
    useEffect(() => {
        if (bankSettings.length > 0 && !selectedBankId) {
            const defaultBank = bankSettings.find((b) => b.isDefault);
            setSelectedBankId(defaultBank?._id || bankSettings[0]._id);
        }
    }, [bankSettings, selectedBankId]);

    const selectedBank = bankSettings.find((b) => b._id === selectedBankId);

    const handleAddBank = async () => {
        if (!newBankName || !newAccountNo || !newCompanyName) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const result = await createBankSetting({
                bankName: newBankName,
                bankAccountNo: newAccountNo,
                companyName: newCompanyName,
                branchName: newBranchName || undefined,
                branchLocation: newBranchLocation || undefined,
                isDefault: bankSettings.length === 0,
            }).unwrap();

            setSelectedBankId(result.data._id);
            setShowAddForm(false);
            setNewBankName('');
            setNewAccountNo('');
            setNewCompanyName('');
            setNewBranchName('');
            setNewBranchLocation('');
            toast.success('Bank account added successfully');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to add bank account');
        }
    };

    const handleExport = () => {
        if (!selectedBank) {
            toast.error('Please select a bank account');
            return;
        }

        // Export ALL staff, not just those with bank accounts
        const totalAmount = payrollData.reduce(
            (acc, curr) => acc + (curr.payableSalary || 0),
            0,
        );

        const [year, monthNum] = month.split('-');
        const monthName = format(
            new Date(parseInt(year!), parseInt(monthNum!) - 1, 1),
            'MMMM',
        );
        const currentDate = format(new Date(), 'dd/MM/yyyy');

        const doc = new jsPDF();
        let y = 20;

        // Date
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Date: ${currentDate}`, 14, y);
        y += 15;

        // Bank Address
        doc.setFontSize(11);
        doc.text('The Manager', 14, y);
        y += 6;
        doc.text(selectedBank.bankName, 14, y);
        y += 6;
        if (selectedBank.branchName) {
            doc.text(selectedBank.branchName, 14, y);
            y += 6;
        }
        if (selectedBank.branchLocation) {
            doc.text(selectedBank.branchLocation, 14, y);
            y += 6;
        }
        y += 8;

        // Subject
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const subjectText = `Subject: Request for fund transfer from account no. ${selectedBank.bankAccountNo} named: ${selectedBank.companyName}`;
        doc.text(subjectText, 14, y, { maxWidth: 180 });
        y += 15;

        // Body
        doc.setFont('helvetica', 'normal');
        doc.text('Dear Sir,', 14, y);
        y += 8;

        const amountInWords = numberToWords(Math.round(totalAmount));
        const bodyText = `We like to request you to transfer of BDT. ${totalAmount.toLocaleString()}/= (${amountInWords} Taka Only) from my current account "${selectedBank.bankAccountNo}" bearing name. ${selectedBank.companyName} to the below listed current account as salary for the month of ${monthName} - ${year}`;

        const lines = doc.splitTextToSize(bodyText, 180);
        doc.text(lines, 14, y);
        y += lines.length * 6 + 10;

        // Table Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('List of Accounts and amount to be credited:', 14, y);
        y += 8;

        // Table - use all payrollData
        const tableData = payrollData.map((row, index) => [
            index + 1,
            row.name || '',
            row.designation || '',
            row.bankAccountNo || 'N/A',
            row.payableSalary?.toLocaleString() || '0',
        ]);

        // Add total row
        tableData.push([
            '',
            '',
            '',
            {
                content: 'Total:',
                styles: { fontStyle: 'bold', halign: 'right' },
            },
            {
                content: totalAmount.toLocaleString(),
                styles: { fontStyle: 'bold' },
            },
        ]);

        autoTable(doc, {
            startY: y,
            head: [
                ['Sl.', 'Name', 'Designation', 'Account No.', 'Amount (BDT)'],
            ],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [33, 33, 33],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
            },
            bodyStyles: {
                textColor: [50, 50, 50],
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 35 },
                3: { cellWidth: 50 },
                4: { cellWidth: 28, halign: 'right' },
            },
        });

        doc.save(`${monthName} ${year.slice(-2)} Salary.pdf`);
        onOpenChange(false);
        toast.success('PDF exported successfully');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Export Salary PDF
                    </DialogTitle>
                    <DialogDescription>
                        Select a bank account for the salary transfer request
                        letter
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {isLoadingSettings ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {!showAddForm ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Select Bank Account</Label>
                                        <Select
                                            value={selectedBankId}
                                            onValueChange={setSelectedBankId}
                                        >
                                            <SelectTrigger>
                                                <Building2 className="h-4 w-4 mr-2 opacity-50" />
                                                <SelectValue placeholder="Choose bank account..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bankSettings.map(
                                                    (
                                                        bank: PayrollBankSetting,
                                                    ) => (
                                                        <SelectItem
                                                            key={bank._id}
                                                            value={bank._id}
                                                        >
                                                            {bank.companyName} -{' '}
                                                            {bank.bankName}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedBank && (
                                        <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
                                            <p>
                                                <strong>Bank:</strong>{' '}
                                                {selectedBank.bankName}
                                            </p>
                                            <p>
                                                <strong>Account No:</strong>{' '}
                                                {selectedBank.bankAccountNo}
                                            </p>
                                            <p>
                                                <strong>Company:</strong>{' '}
                                                {selectedBank.companyName}
                                            </p>
                                            {selectedBank.branchName && (
                                                <p>
                                                    <strong>Branch:</strong>{' '}
                                                    {selectedBank.branchName}
                                                </p>
                                            )}
                                            {selectedBank.branchLocation && (
                                                <p>
                                                    <strong>Location:</strong>{' '}
                                                    {
                                                        selectedBank.branchLocation
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add New Bank Account
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Separator />
                                    <h4 className="font-medium">
                                        Add New Bank Account
                                    </h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="bankName">
                                                Bank Name *
                                            </Label>
                                            <Input
                                                id="bankName"
                                                value={newBankName}
                                                onChange={(e) =>
                                                    setNewBankName(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g., United Commercial Bank"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="accountNo">
                                                Account Number *
                                            </Label>
                                            <Input
                                                id="accountNo"
                                                value={newAccountNo}
                                                onChange={(e) =>
                                                    setNewAccountNo(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g., 2072112000000665"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="companyName">
                                            Company/Office Name *
                                        </Label>
                                        <Input
                                            id="companyName"
                                            value={newCompanyName}
                                            onChange={(e) =>
                                                setNewCompanyName(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g., Graphics Action"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="branchName">
                                                Branch Name
                                            </Label>
                                            <Input
                                                id="branchName"
                                                value={newBranchName}
                                                onChange={(e) =>
                                                    setNewBranchName(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g., Gaibandha Branch"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="branchLocation">
                                                Branch Location
                                            </Label>
                                            <Input
                                                id="branchLocation"
                                                value={newBranchLocation}
                                                onChange={(e) =>
                                                    setNewBranchLocation(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g., Gaibandha"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setShowAddForm(false)
                                            }
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleAddBank}
                                            disabled={isCreating}
                                            className="flex-1"
                                        >
                                            {isCreating && (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            )}
                                            Save Bank
                                        </Button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={!selectedBank || showAddForm}
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Generate PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
