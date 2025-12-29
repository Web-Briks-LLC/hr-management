import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
// @ts-ignore
import InvitationModel from '../models/invitation.model.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};

const listInvitations = async () => {
    await connectDB();

    try {
        const invitations = await InvitationModel.find()
            .sort({ createdAt: -1 })
            .limit(5);

        console.log('\n--- Recent Invitations ---');
        if (invitations.length === 0) {
            console.log('No invitations found.');
        }

        invitations.forEach((inv: any) => {
            console.log('-------------------------------------------');
            console.log(`Email:       ${inv.email}`);
            console.log(`Role:        ${inv.role}`);
            console.log(`Designation: ${inv.designation}`);
            console.log(`Created At:  ${inv.createdAt}`);
            console.log(`Expires At:  ${inv.expiresAt}`);
            console.log(`Is Used:     ${inv.isUsed}`);
            console.log(`Token:       ${inv.token}`);

            const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            console.log(`Link:        ${baseUrl}/sign-up/${inv.token}`);

            const isExpired = new Date() > new Date(inv.expiresAt);
            console.log(`Status:      ${isExpired ? 'EXPIRED' : 'ACTIVE'}`);
        });
        console.log('-------------------------------------------');
    } catch (error) {
        console.error('Error fetching invitations:', error);
    } finally {
        await mongoose.disconnect();
    }
};

listInvitations();
