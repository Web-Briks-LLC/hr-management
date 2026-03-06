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
// @ts-ignore
import * as React from 'react';

interface InvitationEmailProps {
    designation: string;
    department: string;
    salary: number;
    signupUrl: string;
    isReminder?: boolean;
}

export const InvitationEmail = ({
    designation,
    department,
    salary,
    signupUrl,
    isReminder = false,
}: InvitationEmailProps) => {
    const previewText = isReminder
        ? `Reminder: Complete your registration for ${designation}`
        : `You're invited to join Web Briks as ${designation}`;
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
                        <Text style={heading}>
                            {isReminder
                                ? 'Registration Reminder'
                                : 'Welcome to the Team!'}
                        </Text>

                        <Text style={paragraph}>
                            {isReminder
                                ? `This is a friendly reminder to complete your registration for the ${designation} position.`
                                : `We are excited to invite you to join our organization as a ${designation}.`}
                        </Text>

                        <Section style={infoCard}>
                            <Text style={infoHeading}>Position Details:</Text>
                            <Section style={infoItems}>
                                <Text style={infoItem}>
                                    <strong>Designation:</strong> {designation}
                                </Text>
                                <Text style={infoItem}>
                                    <strong>Department:</strong>{' '}
                                    {department || 'N/A'}
                                </Text>
                                <Text style={infoItem}>
                                    <strong>Salary:</strong> ৳
                                    {salary.toLocaleString()}
                                </Text>
                            </Section>
                        </Section>

                        <Section style={btnContainer}>
                            <Button style={button} href={signupUrl}>
                                {isReminder
                                    ? 'Complete Registration'
                                    : 'Accept Invitation'}
                            </Button>
                        </Section>

                        <Text style={paragraph}>
                            This registration link will expire in 48 hours. If
                            you have any questions, please contact our HR
                            department.
                        </Text>

                        <Hr style={hr} />

                        <Text style={footerText}>
                            Best regards,
                            <br />
                            <strong>HR Department, Web Briks LLC</strong>
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

export default InvitationEmail;

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
    backgroundColor: '#f8f9fa',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '32px',
    border: '1px solid #e5e5ea',
};

const infoHeading = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '16px',
    marginTop: '0',
};

const infoItems = {
    margin: '0',
};

const infoItem = {
    fontSize: '16px',
    color: '#1c1c1e',
    margin: '0 0 12px 0',
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

const footerLink = {
    fontSize: '13px',
    color: '#009999',
    textDecoration: 'none',
};
