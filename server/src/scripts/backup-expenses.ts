import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExpenseModel from '../models/expense.model.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGO_URI is not defined in .env file.");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to database for backup.");

    try {
        console.log("Fetching expenses data...");
        const expenses = await ExpenseModel.find({}).lean();
        
        if (expenses.length === 0) {
            console.log("No expenses found to backup.");
            return;
        }

        console.log(`Found ${expenses.length} expenses. Preparing backup...`);

        // Create backup directory at the root of the server folder
        const backupDir = path.join(__dirname, '../../backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilePath = path.join(backupDir, `expenses_backup_${timestamp}.json`);

        fs.writeFileSync(backupFilePath, JSON.stringify(expenses, null, 2), 'utf-8');

        console.log(`\n✅ Backup completed successfully!`);
        console.log(`📁 Backup saved to: ${backupFilePath}`);

    } catch (error) {
        console.error("Backup failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from database.");
    }
}

run().catch(console.error);
