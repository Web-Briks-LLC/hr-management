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
    Button,
} from '@react-email/components';

interface OrderExportEmailProps {
    clientName: string;
    month: string;
    year: string;
    invoiceUrl?: string;
}

export const OrderExportEmail = ({
    clientName,
    month,
    year,
    invoiceUrl,
}: OrderExportEmailProps) => {
    const previewText = `Invoice for ${month} ${year}`;
    const logoUrl =
        'https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png';

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header with Logo */}
                    <Section style={header}>
                        <Img
                            src={logoUrl}
                            width="120"
                            height="56"
                            alt="Web Briks Logo"
                            style={logo}
                        />
                    </Section>

                    {/* Main Card Content */}
                    <Section style={content}>
                        <Text style={heading}>Invoice Ready</Text>

                        <Text style={paragraph}>
                            Hi {clientName},<br />
                            Your invoice for{' '}
                            <strong>
                                {month} {year}
                            </strong>{' '}
                            is ready and attached to this email.
                        </Text>

                        {/* Download/Action Button */}
                        <Section style={btnContainer}>
                            <Button
                                style={button}
                                href={
                                    invoiceUrl || 'http://localhost:3000/orders'
                                }
                            >
                                Download Invoice
                            </Button>
                        </Section>

                        <Text style={paragraph}>
                            If you have any questions or need adjustments, just
                            reply to this email. We're here to help!
                        </Text>

                        <Hr style={hr} />

                        <Text style={footerText}>
                            Best regards,
                            <br />
                            <strong>Web Briks LLC</strong>
                        </Text>
                    </Section>

                    {/* Footer Info */}
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

export default OrderExportEmail;

// Styles inspired by iOS design
const main = {
    backgroundColor: '#f2f2f7', // iOS system gray 6
    fontFamily: 'Inter, sans-serif',
    padding: '40px 0',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px',
    borderRadius: '24px', // Rounded corners like iOS cards
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)', // Soft, diffuse shadow
    maxWidth: '600px',
};

const header = {
    marginBottom: '32px',
};

const logo = {
    display: 'block',
    height: '56px',
    width: 'auto',
    // Logo is naturally left-aligned in the section
};

const content = {
    paddingBottom: '16px',
};

const heading = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1c1c1e', // iOS label color
    marginBottom: '24px',
    letterSpacing: '-0.5px',
};

const paragraph = {
    fontSize: '17px', // iOS body size
    lineHeight: '26px',
    color: '#3a3a3c', // iOS secondary label color
    marginBottom: '24px',
};

const btnContainer = {
    textAlign: 'center' as const,
    marginBottom: '32px',
};

const button = {
    backgroundColor: '#009999', // Teal Accent
    borderRadius: '9999px', // Pill shape
    color: '#ffffff',
    fontSize: '17px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    boxShadow: '0 4px 12px rgba(0, 153, 153, 0.25)', // Colored shadow for the button
};

const hr = {
    borderColor: '#e5e5ea', // iOS separator color
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
    color: '#8e8e93', // iOS tertiary label
    marginBottom: '8px',
};

const footerLink = {
    fontSize: '13px',
    color: '#009999',
    textDecoration: 'none',
};
