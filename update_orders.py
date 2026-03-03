import re

with open("client/src/app/(root)/orders/page.tsx", "r", encoding="utf-8") as f:
    content = f.text if hasattr(f, "text") else f.read()

# Add import
if "EmailDialog" not in content:
    content = re.sub(
        r"(import\s*{[^}]*}\s*from\s*'@/components/ui/dialog';)",
        r"\1\nimport { EmailDialog } from './EmailDialog';",
        content,
    )

# Add state
if "setIsEmailDialogOpen" not in content:
    content = re.sub(
        r"(const \[statusChangeNote, setStatusChangeNote\] = useState\(''\);)",
        r"""\1
    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [emailPendingOrder, setEmailPendingOrder] = useState<IOrder | null>(null);
    const [emailPendingStatus, setEmailPendingStatus] = useState<OrderStatus | null>(null);
    const [isEmailSending, setIsEmailSending] = useState(false);

    const confirmEmailAndStatusChange = async (message: string, downloadLink?: string) => {
        if (!emailPendingOrder || !emailPendingStatus) return;
        setIsEmailSending(true);
        try {
            // First we update the normal status and optionally send extra payload
            // Then we use the frontend wrapper to hit the backend endpoint
            await updateOrderStatus({
                id: emailPendingOrder._id,
                data: {
                    status: emailPendingStatus,
                    customEmailMessage: message,
                    downloadLink,
                    sendEmail: true
                } as any,
            }).unwrap();
            toast.success(`Status updated to ${emailPendingStatus} and email queued!`);
            setIsEmailDialogOpen(false);
            setEmailPendingOrder(null);
            setEmailPendingStatus(null);
        } catch (error: unknown) {
            const err = error as any;
            toast.error(err?.data?.message || 'Failed to update status & send email');
        } finally {
            setIsEmailSending(false);
        }
    };
""",
        content,
    )

# Update handleStatusChange
if "setEmailPendingOrder" not in content:
    content = re.sub(
        r"(if \(newStatus === 'revision'\) \{[\s\S]*?return;\n        \})",
        r"""\1

        if (['cancelled', 'completed', 'delivered'].includes(newStatus)) {
            const orderObj = data?.data.find((o) => o._id === orderId);
            if (orderObj) {
                setEmailPendingOrder(orderObj);
                setEmailPendingStatus(newStatus);
                setIsEmailDialogOpen(true);
                return;
            }
        }
""",
        content
    )

# Insert the component
if "<EmailDialog" not in content:
    content = re.sub(
        r"(<OrderTimelineDialog\s*open=\{isTimelineDialogOpen\}\s*onOpenChange=\{setIsTimelineDialogOpen\}\s*order=\{selectedOrder\}\s*/>)",
        r"""\1
                <EmailDialog
                    open={isEmailDialogOpen}
                    onOpenChange={setIsEmailDialogOpen}
                    order={emailPendingOrder}
                    status={emailPendingStatus as OrderStatus}
                    onSend={confirmEmailAndStatusChange}
                    isLoading={isEmailSending}
                />""",
        content
    )

with open("client/src/app/(root)/orders/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated OrdersPage UI.")
