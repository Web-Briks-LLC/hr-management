import { useState, useMemo } from "react";
import { Mail, Loader } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { useGetClientEmailsQuery } from "@/redux/features/client/clientApi";
import { ClientEmail } from "@/types/client.type";

interface InvoiceEmailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    onSend: (emails: string[]) => Promise<void>;
    isSending: boolean;
    defaultEmails?: string[];
}

export function InvoiceEmailDialog({
    isOpen,
    onClose,
    clientId,
    onSend,
    isSending,
    defaultEmails = [],
}: InvoiceEmailDialogProps) {
    const [selectedEmailRecipients, setSelectedEmailRecipients] = useState<string[]>(defaultEmails);

    const defaultKey = defaultEmails.join(",");

    // Re-seed the recipient list whenever the dialog opens or the client changes.
    // The component stays mounted across invoices, so without this reset it would
    // keep the previous client's address selected and send that invoice to both.
    // (React's recommended "reset state on prop change" pattern — no effect.)
    const [seededFor, setSeededFor] = useState<string | null>(null);
    const openSignature = isOpen ? `${clientId}::${defaultKey}` : null;
    if (isOpen && openSignature !== seededFor) {
        setSeededFor(openSignature);
        setSelectedEmailRecipients(defaultKey ? defaultKey.split(",") : []);
    } else if (!isOpen && seededFor !== null) {
        // Forget the seed on close so every open starts fresh.
        setSeededFor(null);
    }

    const { data: clientEmails, isLoading: isLoadingEmails } = useGetClientEmailsQuery(clientId, {
        skip: !clientId || !isOpen,
    });

    const emailOptions = useMemo(() => {
        if (!clientEmails) return [];
        return clientEmails.map((item: ClientEmail) => ({
            label: item.label,
            value: item.email,
            group: item.type === 'primary' ? 'Main Emails' : 'Team Members',
        }));
    }, [clientEmails]);

    const handleSend = () => {
        // Guard: only ever send to the current client's addresses — the default
        // recipient plus whatever this client's email list actually contains.
        const allowed = new Set<string>([
            ...defaultEmails,
            ...emailOptions.map((option) => option.value),
        ]);
        const recipients = selectedEmailRecipients.filter((email) =>
            allowed.has(email),
        );
        if (recipients.length > 0) {
            onSend(recipients);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-orange-500" />
                        Email Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Select one or multiple recipients to receive this invoice.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4 py-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Recipients</label>
                        {isLoadingEmails ? (
                            <div className="h-10 flex items-center justify-center border rounded-md bg-muted/20">
                                <Loader className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                                <span className="text-xs text-muted-foreground">Loading email list...</span>
                            </div>
                        ) : (
                            <MultiSelect
                                options={emailOptions}
                                selected={selectedEmailRecipients}
                                onChange={setSelectedEmailRecipients}
                                placeholder="Select recipients..."
                                className="w-full"
                            />
                        )}
                    </div>
                </div>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSending}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-orange-500 hover:bg-orange-600 min-w-[120px]"
                        disabled={isSending || selectedEmailRecipients.length === 0}
                        onClick={handleSend}
                    >
                        {isSending ? (
                            <>
                                <Loader className="h-4 w-4 animate-spin mr-2" />
                                Sending...
                            </>
                        ) : (
                            "Send Invoice"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
