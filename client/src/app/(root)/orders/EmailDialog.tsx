import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IOrder, OrderStatus } from "@/types/order.type";

interface EmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: IOrder | null;
    status: OrderStatus;
    onSend: (message: string, downloadLink?: string, selectedEmail?: string) => void;
    isLoading?: boolean;
}

const defaultTemplates: Partial<Record<OrderStatus, string>> = {
    cancelled:
        "Hi {clientName},\n\nUnfortunately, your order '{orderName}' has been cancelled.\n\nOur team has stopped work on this order. If you have any questions or feel this is a mistake, please reach out to us by replying to this email.\n\nBest regards,\nWeb Briks Team",
    completed:
        "Hi {clientName},\n\nYour order '{orderName}' has been marked as completed successfully!\n\nWe have finished processing your requests. Please review the result at your convenience.\n\nBest regards,\nWeb Briks Team",
    delivered:
        "Hi {clientName},\n\nGood news! Your order '{orderName}' has been finally delivered!\n\nYou can download and view your completed files using the link below:\n{downloadLink}\n\nLet us know if you have any questions.\n\nBest regards,\nWeb Briks Team",
};

export const EmailDialog: React.FC<EmailDialogProps> = ({
    open,
    onOpenChange,
    order,
    status,
    onSend,
    isLoading,
}) => {
    const [message, setMessage] = useState("");
    const [downloadLink, setDownloadLink] = useState("");
    const [selectedEmail, setSelectedEmail] = useState<string>("");

    useEffect(() => {
        if (open && order && status) {
            const tmpl = defaultTemplates[status] || `Status updated to ${status}.`;
            // populate variables
            let msg = tmpl
                .replace("{clientName}", order.clientId?.name || "Client")
                .replace("{orderName}", order.orderName || "Order");

            // Link placeholder replacement is done dynamically if needed
            setMessage(msg);
            setDownloadLink("");
            setSelectedEmail(order.clientId?.emails?.[0] || "");
        }
    }, [open, order, status]);

    const handleSend = () => {
        let finalMessage = message;
        if (status === 'delivered') {
            finalMessage = finalMessage.replace("{downloadLink}", downloadLink || 'No link provided');
        }
        onSend(finalMessage, downloadLink, selectedEmail);
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] border-slate-500/20 backdrop-blur-xl bg-card/95">
                <DialogHeader>
                    <DialogTitle>Send Email Notification</DialogTitle>
                    <DialogDescription>
                        Customise the email that will be sent to <strong>{order.clientId?.name}</strong> regarding the order status changing to <strong>{status}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {order.clientId?.emails && order.clientId.emails.length > 1 && (
                        <div className="space-y-2">
                            <Label htmlFor="recipientEmail">Recipient Email</Label>
                            <Select
                                value={selectedEmail}
                                onValueChange={setSelectedEmail}
                            >
                                <SelectTrigger id="recipientEmail" className="w-full">
                                    <SelectValue placeholder="Select email" />
                                </SelectTrigger>
                                <SelectContent>
                                    {order.clientId.emails.map((email) => (
                                        <SelectItem key={email} value={email}>
                                            {email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {status === "delivered" && (
                        <div className="space-y-2">
                            <Label htmlFor="downloadLink">Download Link</Label>
                            <Input
                                id="downloadLink"
                                placeholder="https://..."
                                value={downloadLink}
                                onChange={(e) => setDownloadLink(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="message">Email Message</Label>
                        <Textarea
                            id="message"
                            rows={12}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            {status === "delivered" && "Note: Ensure {downloadLink} remains in the text where you want the link to appear."}
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={isLoading || (status === 'delivered' && !downloadLink)}>
                        {isLoading ? "Sending..." : "Update Status & Send"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
