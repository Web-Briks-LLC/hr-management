// scripts/migrate-loans.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

import PersonModel from '../models/Person.js';
import DebitModel, { DebitType } from '../models/Debit.js';
import UserModel from '../models/user.model.js';

dotenv.config();

const MONGO_URI =
    'mongodb+srv://hrManagement:Oo0kwMllNlxfoDQb@hr-management.ntt3g.mongodb.net/hr-management?retryWrites=true&w=majority&appName=hr-management';

const runMigration = async () => {
    console.log('🚀 Loan Migration Started...');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('📌 Connected to hr-management DB.');

        const oldDb = mongoose.connection.useDb('hrManagement'); // Old database

        // Get a default user for createdBy field
        const users = await UserModel.find({}).toArray();
        const defaultUser =
            users.find(
                (u: any) =>
                    u.username?.toLowerCase().includes('ashad') ||
                    u.name?.toLowerCase().includes('ashad')
            ) || users[0];

        if (!defaultUser) {
            throw new Error(
                'No users found in database. Cannot migrate without a creator.'
            );
        }

        console.log(
            `👤 Using default user: ${defaultUser.name || defaultUser.username}`
        );

        // Load old loan data
        const oldLoans = await oldDb.collection('loanList').find().toArray();
        console.log(`📦 Found ${oldLoans.length} loan records to migrate`);

        // Track persons by phone (unique identifier)
        const personMap = new Map<string, any>();
        let successPerson = 0,
            successTx = 0,
            failed = 0;
        const errors: any[] = [];

        for (const old of oldLoans) {
            try {
                // Use phone as unique key for person, fallback to name
                const personKey = old.phone?.trim() || old.name?.trim();

                let personId = personMap.get(personKey);

                // Create Person if not exists
                if (!personId) {
                    // Check if person already exists in DB
                    let existingPerson = await PersonModel.findOne({
                        $or: [
                            { phone: old.phone?.trim() },
                            { name: old.name?.trim() },
                        ],
                    });

                    if (existingPerson) {
                        personId = existingPerson._id;
                    } else {
                        const newPerson = await PersonModel.create({
                            name: old.name?.trim() || 'Unknown',
                            phone: old.phone?.trim() || undefined,
                            address: old.address?.trim() || undefined,
                            createdBy: defaultUser._id,
                        });
                        personId = newPerson._id;
                        successPerson++;
                    }

                    personMap.set(personKey, personId);
                }

                // Map type: old uses lowercase, new uses "Borrow" / "Return"
                let debitType: DebitType;
                if (old.type?.toLowerCase() === 'borrow') {
                    debitType = DebitType.BORROW;
                } else if (old.type?.toLowerCase() === 'return') {
                    debitType = DebitType.RETURN;
                } else {
                    debitType = DebitType.BORROW; // Default
                }

                // Create Debit
                await DebitModel.create({
                    personId,
                    amount: Number(old.amount) || 0,
                    date: old.date ? new Date(old.date) : new Date(),
                    type: debitType,
                    createdBy: defaultUser._id,
                });

                successTx++;
            } catch (e: any) {
                failed++;
                errors.push({ loan: old.name, reason: e.message });
            }
        }

        console.log(`\n🎯 Migration Completed`);
        console.log(`✔ Persons Created: ${successPerson}`);
        console.log(`✔ Debits Created: ${successTx}`);
        console.log(`❌ Failed: ${failed}`);

        if (errors.length) {
            fs.writeFileSync(
                'loan-migration-errors.json',
                JSON.stringify(errors, null, 2)
            );
            console.log('⚠ Logged errors → loan-migration-errors.json');
        }
    } catch (err) {
        console.error('❌ Fatal Migration Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 DB Disconnected');
    }
};

runMigration();
