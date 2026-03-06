import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import * as React from 'react';

const TEST_EMAIL = 'fuyadhasanfahim179@gmail.com';

async function runTests() {
    const { default: emailService } =
        await import('../services/email.service.js');
    console.log('🚀 Starting email tests to:', TEST_EMAIL);

    try {
        // 1. Invoice Email
        console.log('Sending Invoice Email...');
        await emailService.sendInvoiceEmail({
            to: TEST_EMAIL,
            clientName: 'Test Client',
            month: 'October',
            year: '2023',
            invoiceUrl: 'https://example.com/invoice',
            attachment: {
                filename: 'invoice.pdf',
                content: Buffer.from('dummy pdf content'),
                contentType: 'application/pdf',
            },
        });

        // 2. PIN Reset
        console.log('Sending PIN Reset Email...');
        await emailService.sendPinResetEmail({
            to: TEST_EMAIL,
            resetUrl: '123456',
            staffName: 'Testing',
        });

        // 3. Order Status Update
        console.log('Sending Order Status Email...');
        await emailService.sendOrderStatusEmail({
            to: TEST_EMAIL,
            clientName: 'Test Client',
            orderName: 'E-commerce Website',
            status: 'In Progress',
            message: 'We have started working on your homepage design.',
        });

        // 4. Verification Email
        console.log('Sending Verification Email...');
        await emailService.sendVerificationEmail({
            to: TEST_EMAIL,
            userName: 'Test User',
            verificationUrl: 'https://example.com/verify',
        });

        // 5. Reset Password
        console.log('Sending Reset Password Email...');
        await emailService.sendResetPasswordEmail({
            to: TEST_EMAIL,
            userName: 'Test User',
            resetPasswordUrl: 'https://example.com/reset',
        });

        // 6. Invitation Email
        console.log('Sending Invitation Email...');
        await emailService.sendInvitationEmail({
            to: TEST_EMAIL,
            designation: 'Telemarketer',
            department: 'Sales',
            salary: 25000,
            signupUrl: 'https://example.com/signup',
        });

        // 7. Application Status
        console.log('Sending Application Status Email...');
        await emailService.sendApplicationStatusEmail({
            to: TEST_EMAIL,
            applicantName: 'Hasan Fahim',
            positionTitle: 'Senior Developer',
            status: 'shortlisted',
        });

        // 8. Admin Payment Notification
        console.log('Sending Admin Payment Email...');
        await emailService.sendAdminPaymentEmail({
            to: TEST_EMAIL,
            clientName: 'Test Client',
            invoiceNumber: 'INV-001',
            amount: 500,
            currency: 'USD',
            earningsUrl: 'https://example.com/admin/earnings',
        });

        console.log('✅ All test emails sent successfully!');
    } catch (error) {
        console.error('❌ Error sending test emails:', error);
    }
}

runTests();
