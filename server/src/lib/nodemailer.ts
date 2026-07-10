import { createTransport, type Transporter } from 'nodemailer';
import envConfig from '../config/env.config.js';

let transporter: Transporter | null = null;

function getTransporter() {
    if (!transporter) {
        transporter = createTransport({
            host: envConfig.smtp_host,
            port: envConfig.smtp_port,
            secure: envConfig.smtp_secure === 'true',
            auth: {
                user: envConfig.smtp_user,
                pass: envConfig.smtp_pass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
    }
    return transporter;
}

export async function verifyEmailConnection() {
    try {
        const t = getTransporter();
        await t.verify();
        console.log('SMTP connection verified');
    } catch (err) {
        console.error('SMTP connection failed:', err);
    }
}

export interface SendMailOptions {
    to: string;
    subject: string;
    body: string;
    fromName?: string;
    fromEmail?: string;
}

export async function sendMail({
    to,
    subject,
    body,
    fromName = 'HR Management - Web Briks LLC',
    fromEmail = envConfig.smtp_user,
}: SendMailOptions) {
    const t = getTransporter();

    const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: body,
    };

    const maxRetries = 2;
    let attempt = 0;

    while (true) {
        try {
            await t.sendMail(mailOptions);
            console.log(`[Nodemailer] Email sent to: ${to}`);
            return;
        } catch (err) {
            attempt++;
            if (attempt > maxRetries) {
                console.error('Email sending failed permanently:', err);
                throw err;
            }
            await new Promise((res) => setTimeout(res, attempt * 500));
        }
    }
}
