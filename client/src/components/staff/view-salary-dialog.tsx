'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, Loader, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function ViewSalaryDialog() {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [salaryData, setSalaryData] = useState<{
        salary: number;
        salaryVisibleToEmployee: boolean;
    } | null>(null);
    const [showSalary, setShowSalary] = useState(false);

    // Auto-hide salary after 30 seconds
    useEffect(() => {
        if (showSalary) {
            const timer = setTimeout(() => {
                setShowSalary(false);
                setSalaryData(null);
                toast.info('Salary information hidden for security');
            }, 30000); // 30 seconds

            return () => clearTimeout(timer);
        }
    }, [showSalary]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) {
            toast.error('Please enter your password');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/staffs/view-salary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to verify password');
            }

            setSalaryData(data.data);
            setShowSalary(true);
            setPassword('');
            toast.success(
                'Password verified! Salary will be hidden after 30 seconds.',
            );
        } catch (err: any) {
            toast.error(err.message || 'Invalid password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setPassword('');
        setShowSalary(false);
        setSalaryData(null);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) handleClose();
                else setOpen(true);
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline">
                    <DollarSign className=" h-4 w-4" />
                    View My Salary
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>View Salary Information</DialogTitle>
                    <DialogDescription>
                        Enter your password to view your salary details
                    </DialogDescription>
                </DialogHeader>

                {!showSalary ? (
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <Label htmlFor="password">Password *</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Enter your password"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader className=" h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & View'
                                )}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Your Monthly Salary
                                    </p>
                                    <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                                        ৳{salaryData?.salary.toLocaleString()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                🔒 <strong>Security Notice:</strong> This
                                information will automatically hide after 30
                                seconds for your security.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleClose}>Close</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
