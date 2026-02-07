import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface PinResetEmailProps {
    staffName: string;
    resetUrl: string;
}

export const PinResetEmail = ({ staffName, resetUrl }: PinResetEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Reset your Salary PIN</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Reset Salary PIN</Heading>
                    <Text style={text}>Hello {staffName},</Text>
                    <Text style={text}>
                        You have requested to reset your Salary PIN. Click the
                        button below to set a new PIN.
                    </Text>
                    <Section style={btnContainer}>
                        <Button style={button} href={resetUrl}>
                            Reset PIN
                        </Button>
                    </Section>
                    <Text style={text}>
                        Or copy and paste this link into your browser:
                    </Text>
                    <Text style={linkText}>
                        <Link href={resetUrl} style={link}>
                            {resetUrl}
                        </Link>
                    </Text>
                    <Text style={footer}>
                        If you didn't request this, you can ignore this email.
                        The link will expire in 1 hour.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default PinResetEmail;

const main = {
    backgroundColor: '#ffffff',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '560px',
};

const h1 = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0',
    color: '#333333',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
};

const btnContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
};

const button = {
    backgroundColor: '#000000',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px',
};

const linkText = {
    ...text,
    whiteSpace: 'pre-wrap' as const, // Fix type error if needed, but string works usually
    wordBreak: 'break-all' as const,
};

const link = {
    color: '#0a85ea',
    textDecoration: 'underline',
};

const footer = {
    color: '#898989',
    fontSize: '14px',
    lineHeight: '22px',
    marginTop: '12px',
};
