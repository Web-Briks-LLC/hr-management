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

type ApplicationStatus =
    | 'pending'
    | 'reviewed'
    | 'shortlisted'
    | 'rejected'
    | 'hired';

interface ApplicationStatusEmailProps {
    applicantName: string;
    positionTitle: string;
    status: ApplicationStatus;
    companyName?: string;
}

export const ApplicationStatusEmail = ({
    applicantName,
    positionTitle,
    status,
    companyName = 'Web Briks LLC',
}: ApplicationStatusEmailProps) => {
    const statusConfig = {
        pending: {
            title: 'Application Received',
            color: '#1c1c1e',
            icon: '📩',
            message: `Thank you for applying for the ${positionTitle} position. We have received your application and will review it shortly.`,
        },
        reviewed: {
            title: 'Application Under Review',
            color: '#007aff',
            icon: '🔍',
            message: `Your application for the ${positionTitle} position is currently being reviewed by our team. We'll get back to you soon with an update.`,
        },
        shortlisted: {
            title: "You've Been Shortlisted!",
            color: '#34c759',
            icon: '🎉',
            message: `Great news! You have been shortlisted for the ${positionTitle} position. Our HR team will contact you soon to schedule an interview.`,
        },
        rejected: {
            title: 'Application Update',
            color: '#ff3b30',
            icon: '✉️',
            message: `Thank you for your interest in the ${positionTitle} position. After careful consideration, we have decided not to move forward with your application at this time.`,
        },
        hired: {
            title: 'Welcome to the Team!',
            color: '#5856d6',
            icon: '🎊',
            message: `Congratulations! You have been selected for the ${positionTitle} position. We are thrilled to have you join us!`,
        },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const previewText = `${config.title} - ${positionTitle}`;
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
                        <Text
                            style={{
                                ...statusBadge,
                                color: config.color,
                                borderColor: config.color,
                            }}
                        >
                            {config.icon} {config.title}
                        </Text>

                        <Text style={paragraph}>Dear {applicantName},</Text>

                        <Text style={paragraph}>{config.message}</Text>

                        {status === 'shortlisted' && (
                            <Section style={nextSteps}>
                                <Text style={nextStepsHeading}>
                                    Next Steps:
                                </Text>
                                <ul style={list}>
                                    <li style={listItem}>
                                        Prepare for a potential interview
                                    </li>
                                    <li style={listItem}>
                                        Keep your phone and email accessible
                                    </li>
                                    <li style={listItem}>
                                        Review the job requirements
                                    </li>
                                </ul>
                            </Section>
                        )}

                        {status === 'hired' && (
                            <Section style={nextSteps}>
                                <Text style={nextStepsHeading}>
                                    What's Next?
                                </Text>
                                <Text style={paragraph}>
                                    Our HR team will contact you shortly with
                                    the onboarding details and contract.
                                </Text>
                            </Section>
                        )}

                        <Text style={paragraph}>
                            {status === 'rejected'
                                ? 'We wish you the very best in your career journey and encourage you to apply for future openings.'
                                : 'Thank you for your interest in joining Web Briks.'}
                        </Text>

                        <Hr style={hr} />

                        <Text style={footerText}>
                            Best regards,
                            <br />
                            <strong>HR Team, {companyName}</strong>
                        </Text>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerLegal}>
                            1209 Mountain Road PL NE, STE R, Albuquerque, NM
                            87110, US
                        </Text>
                        <Link
                            href="mailto:career@webbriks.com"
                            style={footerLink}
                        >
                            career@webbriks.com
                        </Link>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ApplicationStatusEmail;

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

const statusBadge = {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '24px',
};

const paragraph = {
    fontSize: '17px',
    lineHeight: '26px',
    color: '#3a3a3c',
    marginBottom: '24px',
};

const nextSteps = {
    backgroundColor: '#f8f9fa',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '32px',
    borderLeft: '4px solid #009999',
};

const nextStepsHeading = {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: '12px',
    marginTop: '0',
};

const list = {
    margin: '0',
    paddingLeft: '20px',
};

const listItem = {
    fontSize: '16px',
    color: '#3a3a3c',
    marginBottom: '8px',
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
