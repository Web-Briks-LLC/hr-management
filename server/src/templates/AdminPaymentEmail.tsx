import {
    Html,
    Body,
    Head,
    Hr,
    Container,
    Preview,
    Section,
    Text,
    Img,
    Button,
} from '@react-email/components';
// @ts-ignore
import * as React from 'react';

interface AdminPaymentEmailProps {
    clientName: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    earningsUrl: string;
}

export const AdminPaymentEmail = ({
    clientName,
    invoiceNumber,
    amount,
    currency,
    earningsUrl,
}: AdminPaymentEmailProps) => {
    const previewText = `Action Required: Payment Received from ${clientName}`;
    const logoUrl =
        'https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png';

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img
                            src={logoUrl}
                            width="120"
                            height="56"
                            alt="Web Briks Logo"
                            style={logo}
                        />
                    </Section>

                    <Section style={content}>
                        <Text style={heading}>Payment Received</Text>

                        <Text style={paragraph}>
                            Client <strong>{clientName}</strong> has
                            successfully paid{' '}
                            <strong>
                                {amount} {currency}
                            </strong>{' '}
                            for Invoice <strong>#{invoiceNumber}</strong>.
                        </Text>

                        <Section style={infoCard}>
                            <Text style={infoText}>
                                This earning is now marked as "Paid" but
                                unconverted. Please log in to the admin
                                dashboard to apply the correct BDT exchange
                                rate.
                            </Text>
                        </Section>

                        <Section style={btnContainer}>
                            <Button style={button} href={earningsUrl}>
                                Convert to BDT
                            </Button>
                        </Section>

                        <Hr style={hr} />

                        <Text style={footerText}>
                            System Notification
                            <br />
                            <strong>Web Briks Management Portal</strong>
                        </Text>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerLegal}>
                            Web Briks LLC - Internal Notification
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default AdminPaymentEmail;

const main = {
    backgroundColor: '#f2f2f7',
    fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '40px 0',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
    maxWidth: '600px',
};

const header = {
    marginBottom: '32px',
};

const logo = {
    display: 'block',
    height: '56px',
    width: 'auto',
};

const content = {
    paddingBottom: '16px',
};

const heading = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: '24px',
    letterSpacing: '-0.5px',
};

const paragraph = {
    fontSize: '17px',
    lineHeight: '26px',
    color: '#3a3a3c',
    marginBottom: '24px',
};

const infoCard = {
    backgroundColor: '#fef2f2',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '32px',
    border: '1px solid #fee2e2',
};

const infoText = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#991b1b',
    margin: '0',
};

const btnContainer = {
    textAlign: 'center' as const,
    marginBottom: '32px',
};

const button = {
    backgroundColor: '#009999',
    borderRadius: '9999px',
    color: '#ffffff',
    fontSize: '17px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    boxShadow: '0 4px 12px rgba(0, 153, 153, 0.25)',
};

const hr = {
    borderColor: '#e5e5ea',
    margin: '32px 0 24px',
};

const footerText = {
    fontSize: '15px',
    lineHeight: '24px',
    color: '#3a3a3c',
};

const footer = {
    marginTop: '32px',
    textAlign: 'center' as const,
};

const footerLegal = {
    fontSize: '13px',
    color: '#8e8e93',
    marginBottom: '8px',
};
