import React, { useState, useEffect, useMemo } from "react";
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
import { Loader2, Mail } from "lucide-react";
import { IOrder, OrderStatus } from "@/types/order.type";
import { useGetClientEmailsQuery } from "@/redux/features/client/clientApi";
import { MultiSelect } from "@/components/ui/multi-select";

interface EmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: IOrder | null;
    status: OrderStatus;
    onSend: (message: string, downloadLink?: string, selectedEmails?: string[]) => void;
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
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

    const clientId = order?.clientId?._id;
    const { data: emailsData, isLoading: isLoadingEmails } = useGetClientEmailsQuery(clientId!, {
        skip: !clientId || !open,
    });

    const emailOptions = useMemo(() => {
        if (!emailsData) return [];
        return emailsData.map((item: any) => ({
            label: `${item.name} (${item.email}) - ${item.type}`,
            value: item.email,
        }));
    }, [emailsData]);

    useEffect(() => {
        if (open && order && status) {
            const tmpl = defaultTemplates[status] || `Status updated to ${status}.`;
            // populate variables
            const msg = tmpl
                .replace("{clientName}", order.clientId?.name || "Client")
                .replace("{orderName}", order.orderName || "Order");

            setMessage(msg);
            setDownloadLink("");
            
            // Set default recipient to client's primary email if available
            if (order.clientId?.emails?.[0]) {
                setSelectedEmails([order.clientId.emails[0]]);
            } else {
                setSelectedEmails([]);
            }
        }
    }, [open, order, status]);

    const handleSend = () => {
        let finalMessage = message;
        if (status === 'delivered') {
            finalMessage = finalMessage.replace("{downloadLink}", downloadLink || 'No link provided');
        }
        onSend(finalMessage, downloadLink, selectedEmails);
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] border-slate-500/20 backdrop-blur-xl bg-card/95">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Send Email Notification
                    </DialogTitle>
                    <DialogDescription>
                        Customise the email that will be sent to <strong>{order.clientId?.name}</strong> regarding the order status changing to <strong>{status}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipientEmails">Recipient Emails (Multi-select)</Label>
                        {isLoadingEmails ? (
                            <div className="h-10 w-full flex items-center justify-center border rounded-md bg-muted/20">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                                <span className="text-xs text-muted-foreground">Loading contact list...</span>
                            </div>
                        ) : (
                            <MultiSelect
                                options={emailOptions}
                                onChange={setSelectedEmails}
                                selected={selectedEmails}
                                placeholder="Select recipients..."
                                className="w-full"
                            />
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            Selecting multiple emails will send the update to all chosen recipients.
                        </p>
                    </div>

                    {status === "delivered" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label htmlFor="downloadLink">Download Link</Label>
                            <Input
                                id="downloadLink"
                                placeholder="https://..."
                                value={downloadLink}
                                onChange={(e) => setDownloadLink(e.target.value)}
                                className="bg-muted/30 focus-visible:ring-primary/30"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="message">Email Message</Label>
                        <Textarea
                            id="message"
                            rows={10}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="font-mono text-xs bg-muted/30 focus-visible:ring-primary/30 resize-none"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] text-muted-foreground italic">
                                {status === "delivered" && "Note: Ensure {downloadLink} remains in the text for auto-replacement."}
                            </p>
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {selectedEmails.length} recipient(s) selected
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSend} 
                        disabled={isLoading || (status === 'delivered' && !downloadLink) || selectedEmails.length === 0}
                        className="min-w-[140px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Sending...
                            </>
                        ) : "Update Status & Send"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

