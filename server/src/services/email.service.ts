import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { OrderExportEmail } from "../templates/OrderExportEmail.js";
import * as React from "react";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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
            from: `"Web Briks" <${process.env.SMTP_USER}>`,
            to: data.to,
            subject: `Invoice for ${data.month} ${data.year} - Web Briks`,
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
        console.error("Error sending invoice email:", error);
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
        const { PinResetEmail } = await import("../templates/PinResetEmail.js");
        const emailHtml = await render(
            React.createElement(PinResetEmail, {
                staffName: data.staffName,
                resetUrl: data.resetUrl,
            }),
        );

        const mailOptions = {
            from: `"Web Briks" <${process.env.SMTP_USER}>`,
            to: data.to,
            subject: "Reset your Salary PIN - Web Briks",
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error("Error sending PIN reset email:", error);
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
        // Because of dynamically created format on frontend, we send it straight:
        // We pad it inside a basic layout to look nice.
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Order Status Update</h2>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Order:</strong> ${data.orderName}</p>
                    <p><strong>New Status:</strong> <span style="text-transform: uppercase;">${data.status}</span></p>
                </div>
                <div style="white-space: pre-wrap; margin-bottom: 30px; font-size: 16px; color: #444;">
${data.message.replace(/\n/g, "<br/>")}
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #888; font-size: 12px; text-align: center;">This is an automated message from Web Briks LLC.</p>
            </div>
        `;

        const mailOptions = {
            from: `"Web Briks" <${process.env.SMTP_USER}>`,
            to: data.to,
            subject: `Order Update: ${data.orderName} (${data.status})`,
            html: emailHtml,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error("Error sending order status email:", error);
        throw error;
    }
};

export default {
    sendInvoiceEmail,
    sendPinResetEmail,
    sendOrderStatusEmail,
};
