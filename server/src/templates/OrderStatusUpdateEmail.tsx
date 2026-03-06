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
    Link,
} from '@react-email/components';
// @ts-ignore
import * as React from 'react';

interface OrderStatusUpdateEmailProps {
    clientName: string;
    orderName: string;
    status: string;
    message: string;
}

export const OrderStatusUpdateEmail = ({
    clientName,
    orderName,
    status,
    message,
}: OrderStatusUpdateEmailProps) => {
    const previewText = `Order Update: ${orderName} (${status})`;
    const logoUrl =
        'https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png';

    // Format newlines in message for HTML
    const formattedMessage = message.split('\n').map((line, i) => (
        <React.Fragment key={i}>
            {line}
            <br />
        </React.Fragment>
    ));

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
                        <Text style={heading}>Order Status Update</Text>

                        <Text style={paragraph}>
                            Hi {clientName},<br />
                            There is an update on your order{' '}
                            <strong>{orderName}</strong>.
                        </Text>

                        <Section style={statusCard}>
                            <Text style={statusLabel}>New Status</Text>
                            <Text style={statusValue}>
                                {status.replace('_', ' ').toUpperCase()}
                            </Text>
                        </Section>

                        <Section style={messageSection}>
                            <Text style={messageHeading}>Update Details:</Text>
                            <Text style={messageBody}>{formattedMessage}</Text>
                        </Section>

                        <Hr style={hr} />

                        <Text style={footerText}>
                            Best regards,
                            <br />
                            <strong>Web Briks LLC</strong>
                        </Text>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerLegal}>
                            1209 Mountain Road PL NE, STE R, Albuquerque, NM
                            87110, US
                        </Text>
                        <Link
                            href="mailto:info@webbriks.com"
                            style={footerLink}
                        >
                            info@webbriks.com
                        </Link>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default OrderStatusUpdateEmail;

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

const statusCard = {
    backgroundColor: '#009999',
    padding: '20px',
    borderRadius: '16px',
    marginBottom: '32px',
    textAlign: 'center' as const,
};

const statusLabel = {
    fontSize: '12px',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    margin: '0 0 4px 0',
};

const statusValue = {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0',
    letterSpacing: '0.5px',
};

const messageSection = {
    marginBottom: '32px',
};

const messageHeading = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '12px',
};

const messageBody = {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#3a3a3c',
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e5e5ea',
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

const footerLink = {
    fontSize: '13px',
    color: '#009999',
    textDecoration: 'none',
};
