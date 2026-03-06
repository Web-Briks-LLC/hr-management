import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { OrderExportEmail } from '../templates/OrderExportEmail.js';
import { VerificationEmail } from '../templates/VerificationEmail.js';
import { ResetPasswordEmail } from '../templates/ResetPasswordEmail.js';
import { InvitationEmail } from '../templates/InvitationEmail.js';
import { ApplicationStatusEmail } from '../templates/ApplicationStatusEmail.js';
import { OrderStatusUpdateEmail } from '../templates/OrderStatusUpdateEmail.js';
import { AdminPaymentEmail } from '../templates/AdminPaymentEmail.js';
import * as React from 'react';
import envConfig from '../config/env.config.js';

const transporter = nodemailer.createTransport({
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

interface SendInvoiceData {
    to: string;
    clientName: string;
    month: string;
    year: string;
    invoiceUrl?: string;
    attachment: {
        filename: string;
        content: Buffer;
        contentType: string;
    };
}

const sendInvoiceEmail = async (data: SendInvoiceData) => {
    try {
        const emailHtml = await render(
            React.createElement(OrderExportEmail, {
                clientName: data.clientName as string,
                month: data.month as string,
                year: data.year as string,
                invoiceUrl: data.invoiceUrl as string,
            }),
        );

        const mailOptions = {
            from: 'Invoice | WebBriks',
            to: data.to,
            subject: `Invoice for ${data.month} ${data.year} - WebBriks`,
            html: emailHtml,
            attachments: [
                {
                    filename: data.attachment.filename,
                    content: data.attachment.content,
                    contentType: data.attachment.contentType,
                },
            ],
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending invoice email:', error);
        throw error;
    }
};

interface SendPinResetData {
    to: string;
    staffName: string;
    resetUrl: string;
}

const sendPinResetEmail = async (data: SendPinResetData) => {
    try {
        const { PinResetEmail } = await import('../templates/PinResetEmail.js');
        const emailHtml = await render(
            React.createElement(PinResetEmail, {
                staffName: data.staffName,
                resetUrl: data.resetUrl,
            }),
        );

        const mailOptions = {
            from: 'HR Management | WebBriks',
            to: data.to,
            subject: 'Reset your Salary PIN - WebBriks',
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending PIN reset email:', error);
        throw error;
    }
};

interface SendOrderStatusData {
    to: string;
    clientName: string;
    orderName: string;
    status: string;
    message: string;
}

const sendOrderStatusEmail = async (data: SendOrderStatusData) => {
    try {
        const emailHtml = await render(
            React.createElement(OrderStatusUpdateEmail, {
                clientName: data.clientName,
                orderName: data.orderName,
                status: data.status,
                message: data.message,
            }),
        );

        const mailOptions = {
            from: 'HR Management | WebBriks',
            to: data.to,
            subject: `Order Update: ${data.orderName} (${data.status})`,
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending order status email:', error);
        throw error;
    }
};

interface SendVerificationData {
    to: string;
    userName: string;
    verificationUrl: string;
}

const sendVerificationEmail = async (data: SendVerificationData) => {
    try {
        const emailHtml = await render(
            React.createElement(VerificationEmail, {
                userName: data.userName,
                verificationUrl: data.verificationUrl,
            }),
        );

        const mailOptions = {
            from: 'HR Management | WebBriks',
            to: data.to,
            subject: 'Verify Your Email - WebBriks',
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

interface SendResetPasswordData {
    to: string;
    userName: string;
    resetPasswordUrl: string;
}

const sendResetPasswordEmail = async (data: SendResetPasswordData) => {
    try {
        const emailHtml = await render(
            React.createElement(ResetPasswordEmail, {
                userName: data.userName,
                resetPasswordUrl: data.resetPasswordUrl,
            }),
        );

        const mailOptions = {
            from: 'HR Management | WebBriks',
            to: data.to,
            subject: 'Reset Your Password - WebBriks',
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending reset password email:', error);
        throw error;
    }
};

interface SendInvitationData {
    to: string;
    designation: string;
    department: string;
    salary: number;
    signupUrl: string;
    isReminder?: boolean;
}

const sendInvitationEmail = async (data: SendInvitationData) => {
    try {
        const emailHtml = await render(
            React.createElement(InvitationEmail, {
                designation: data.designation,
                department: data.department,
                salary: data.salary,
                signupUrl: data.signupUrl,
                isReminder: data.isReminder || false,
            }),
        );

        const mailOptions = {
            from: 'HR Management | WebBriks',
            to: data.to,
            subject: data.isReminder
                ? 'Reminder: Complete Your Registration - WebBriks'
                : "You're Invited to Join Our Team - WebBriks",
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending invitation email:', error);
        throw error;
    }
};

interface SendApplicationStatusData {
    to: string;
    applicantName: string;
    positionTitle: string;
    status: any;
}

const sendApplicationStatusEmail = async (data: SendApplicationStatusData) => {
    try {
        const emailHtml = await render(
            React.createElement(ApplicationStatusEmail, {
                applicantName: data.applicantName,
                positionTitle: data.positionTitle,
                status: data.status,
            }),
        );

        const mailOptions = {
            from: 'HR Management | WebBriks',
            to: data.to,
            subject: 'Application Update - WebBriks',
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending application status email:', error);
        throw error;
    }
};

interface SendAdminPaymentData {
    to: string;
    clientName: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    earningsUrl: string;
}

const sendAdminPaymentEmail = async (data: SendAdminPaymentData) => {
    try {
        const emailHtml = await render(
            React.createElement(AdminPaymentEmail, {
                clientName: data.clientName,
                invoiceNumber: data.invoiceNumber,
                amount: data.amount,
                currency: data.currency,
                earningsUrl: data.earningsUrl,
            }),
        );

        const mailOptions = {
            from: 'Payment - HR Management | WebBriks',
            to: data.to,
            subject: `Payment Received from ${data.clientName}`,
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Error sending admin payment notification:', error);
        throw error;
    }
};

export default {
    sendInvoiceEmail,
    sendPinResetEmail,
    sendOrderStatusEmail,
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendInvitationEmail,
    sendApplicationStatusEmail,
    sendAdminPaymentEmail,
};
