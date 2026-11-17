import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import {
    inspectProductionLocks,
    repairProductionLocks,
} from '../services/production-repair.service.js';

// Read-only by default. --apply requires an explicit actor and creates audit events.
const apply = process.argv.includes('--apply');
const actor = process.argv.find((arg) => arg.startsWith('--actor='))?.slice(8);
const orderId = process.argv
    .find((arg) => arg.startsWith('--order='))
    ?.slice(8);
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
await mongoose.connect(process.env.MONGO_URI);
try {
    const issues = await inspectProductionLocks(orderId);
    console.log(
        JSON.stringify(
            {
                mode: apply ? 'repair' : 'read-only',
                total: issues.length,
                repairable: issues.filter((i) => i.repairable).length,
                manualReview: issues.filter((i) => !i.repairable).length,
                ...(process.argv.includes('--summary') ? {} : { issues }),
            },
            null,
            2,
        ),
    );
    if (apply) {
        const user = actor ? await User.findById(actor).lean() : null;
        if (
            !user ||
            !['super_admin', 'admin', 'hr_manager'].includes(user.role)
        )
            throw new Error('--actor must identify an administrator');
        const orders = [
            ...new Set(
                issues.filter((i) => i.repairable).map((i) => i.orderId),
            ),
        ];
        for (const id of orders) {
            const imageNames = issues
                .filter((i) => i.orderId === id && i.repairable)
                .map((i) => i.imageName);
            console.log(
                await repairProductionLocks(
                    {
                        orderId: id,
                        imageNames,
                        note: 'Repair verified locks of missing or closed sessions',
                    },
                    actor!,
                ),
            );
        }
    }
} finally {
    await mongoose.disconnect();
}
