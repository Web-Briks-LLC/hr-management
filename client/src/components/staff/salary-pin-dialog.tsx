"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    useForgotSalaryPinMutation,
    useSetSalaryPinMutation,
    useVerifySalaryPinMutation,
} from "@/redux/features/staff/staffApi";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SalaryPinDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staffId: string;
    isPinSet: boolean;
    onSuccess: () => void;
}

export function SalaryPinDialog({
    open,
    onOpenChange,
    staffId,
    isPinSet,
    onSuccess,
}: SalaryPinDialogProps) {
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [mode, setMode] = useState<"verify" | "set" | "forgot">(
        isPinSet ? "verify" : "set",
    );

    const [verifySalaryPin, { isLoading: isVerifying }] =
        useVerifySalaryPinMutation();
    const [setSalaryPin, { isLoading: isSetting }] = useSetSalaryPinMutation();
    const [forgotSalaryPin, { isLoading: isSendingEmail }] =
        useForgotSalaryPinMutation();

    const isLoading = isVerifying || isSetting || isSendingEmail;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === "set") {
            if (pin.length < 4) {
                toast.error("PIN must be at least 4 digits");
                return;
            }
            if (pin !== confirmPin) {
                toast.error("PINs do not match");
                return;
            }

            try {
                await setSalaryPin({ staffId, pin }).unwrap();
                toast.success("PIN set successfully");
                onSuccess();
            } catch (error) {
                toast.error((error as Error).message || "Failed to set PIN");
            }
        } else if (mode === "verify") {
            try {
                await verifySalaryPin({ staffId, pin }).unwrap();
                onSuccess();
            } catch (error) {
                toast.error((error as Error).message || "Invalid PIN");
                setPin("");
            }
        } else if (mode === "forgot") {
            try {
                await forgotSalaryPin({ staffId }).unwrap();
                toast.success("Reset link sent to your email");
                setMode("verify");
            } catch (error) {
                toast.error(
                    (error as Error).message || "Failed to send reset link",
                );
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "set" && "Set Salary PIN"}
                        {mode === "verify" && "Enter Salary PIN"}
                        {mode === "forgot" && "Reset Salary PIN"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "set" &&
                            "Set a secure PIN to protect your salary information."}
                        {mode === "verify" &&
                            "Enter your PIN to view salary details."}
                        {mode === "forgot" &&
                            "We will send a password reset link to your registered email address."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode !== "forgot" && (
                        <div className="space-y-2">
                            <Label htmlFor="pin">PIN</Label>
                            <Input
                                id="pin"
                                type="password"
                                placeholder={
                                    mode === "set" ? "Create PIN" : "Enter PIN"
                                }
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                    )}

                    {mode === "set" && (
                        <div className="space-y-2">
                            <Label htmlFor="confirmPin">Confirm PIN</Label>
                            <Input
                                id="confirmPin"
                                type="password"
                                placeholder="Confirm PIN"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-col sm:space-x-0 space-y-2 items-stretch! mt-4">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {mode === "set" && "Set PIN & View"}
                            {mode === "verify" && "Unlock"}
                            {mode === "forgot" && "Send Reset Link"}
                        </Button>

                        {mode === "verify" && (
                            <Button
                                type="button"
                                variant="link"
                                className="w-full text-xs text-muted-foreground"
                                onClick={() => setMode("forgot")}
                            >
                                Forgot PIN?
                            </Button>
                        )}

                        {mode === "forgot" && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => setMode("verify")}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Verification
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
