import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";

interface PaymentReceiptEmailProps {
    clientName: string;
    invoiceNumber: string;
    amountPaidCurrency: string;
    amountPaidValue: number;
    amountPaidBDT?: number;
    referenceId: string;
    paymentGateway: string;
    date: Date;
}

export default function PaymentReceiptEmail({
    clientName = "Valued Client",
    invoiceNumber = "INV-000",
    amountPaidCurrency = "USD",
    amountPaidValue = 0,
    amountPaidBDT,
    referenceId = "N/A",
    paymentGateway = "Stripe",
    date = new Date(),
}: PaymentReceiptEmailProps) {
    const formattedDate = new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeStyle: "short",
    }).format(new Date(date));

    // Calculate amounts properly
    const formattedAmount = `${amountPaidCurrency.toUpperCase()} ${amountPaidValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedBDT = amountPaidBDT
        ? `(BDT ${amountPaidBDT.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        : "";

    return (
        <Html>
            <Head />
            <Preview>
                Your receipt from Web Briks for Invoice #{invoiceNumber}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img
                            src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png"
                            width="130"
                            alt="Web Briks"
                            style={logo}
                        />
                    </Section>

                    <Section style={card}>
                        <div style={accentBar} />
                        <Section style={content}>
                            <Heading style={title}>Payment Receipt</Heading>
                            <Text style={text}>Hi {clientName},</Text>
                            <Text style={text}>
                                Thank you for your payment! Your transaction has
                                been successfully processed, and we have updated
                                our records.
                            </Text>

                            <Section style={receiptBox}>
                                <Text style={receiptRow}>
                                    <span style={receiptLabel}>
                                        Amount Paid:
                                    </span>
                                    <span style={receiptValue}>
                                        {formattedAmount} {formattedBDT}
                                    </span>
                                </Text>
                                <Hr style={divider} />
                                <Text style={receiptRow}>
                                    <span style={receiptLabel}>
                                        Invoice Number:
                                    </span>
                                    <span style={receiptValue}>
                                        #{invoiceNumber}
                                    </span>
                                </Text>
                                <Hr style={divider} />
                                <Text style={receiptRow}>
                                    <span style={receiptLabel}>
                                        Payment Method:
                                    </span>
                                    <span style={receiptValue}>
                                        {paymentGateway}
                                    </span>
                                </Text>
                                <Hr style={divider} />
                                <Text style={receiptRow}>
                                    <span style={receiptLabel}>
                                        Reference ID:
                                    </span>
                                    <span style={receiptValue}>
                                        {referenceId}
                                    </span>
                                </Text>
                                <Hr style={divider} />
                                <Text style={receiptRow}>
                                    <span style={receiptLabel}>Date:</span>
                                    <span style={receiptValue}>
                                        {formattedDate}
                                    </span>
                                </Text>
                            </Section>

                            <Text style={footerText}>
                                If you have any questions about this receipt,
                                simply reply to this email or reach out to our
                                support team.
                            </Text>
                        </Section>
                    </Section>

                    <Text style={bottomFooter}>
                        &copy; {new Date().getFullYear()} Web Briks LLC. All
                        rights reserved.
                        <br />
                        <Link href="https://webbriks.com" style={footerLink}>
                            webbriks.com
                        </Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: "#F9FAFB",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    padding: "40px 0",
};

const container = {
    margin: "0 auto",
    maxWidth: "520px",
    padding: "0 20px",
};

const header = {
    padding: "0 0 24px",
    textAlign: "center" as const,
};

const logo = {
    margin: "0 auto",
};

const card = {
    backgroundColor: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
};

const accentBar = {
    backgroundColor: "#00C2A8", // Teal 500 equivalent mostly
    height: "6px",
    width: "100%",
};

const content = {
    padding: "32px 40px",
};

const title = {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#111827",
    margin: "0 0 24px",
    textAlign: "center" as const,
};

const text = {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#4B5563",
    margin: "0 0 16px",
};

const receiptBox = {
    backgroundColor: "#F3F4F6",
    borderRadius: "12px",
    padding: "24px",
    margin: "32px 0",
};

const receiptRow = {
    margin: "0",
    padding: "12px 0",
    fontSize: "14px",
};

const receiptLabel = {
    color: "#6B7280",
    fontWeight: "500",
    display: "inline-block",
    width: "140px",
};

const receiptValue = {
    color: "#111827",
    fontWeight: "600",
};

const divider = {
    borderColor: "#E5E7EB",
    margin: "0",
};

const footerText = {
    fontSize: "14px",
    lineHeight: "22px",
    color: "#6B7280",
    margin: "0",
    textAlign: "center" as const,
};

const bottomFooter = {
    margin: "32px 0 0",
    fontSize: "12px",
    color: "#9CA3AF",
    textAlign: "center" as const,
};

const footerLink = {
    color: "#9CA3AF",
    textDecoration: "underline",
    marginTop: "4px",
    display: "inline-block",
};
