import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/hr-management';

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db!;
        
        // Find Test Order 8
        const order = await db.collection('orders').findOne({
            orderName: { $regex: 'Test Order 8', $options: 'i' }
        });

        if (order) {
            console.log('Found Test Order 8. Updating status to in_progress...');
            await db.collection('orders').updateOne(
                { _id: order._id },
                {
                    $set: { status: 'in_progress' },
                    $push: {
                        timeline: {
                            status: 'in_progress',
                            timestamp: new Date(),
                            note: 'QC Passed: All 10 images approved across 4 revision batches. Order 100% complete.'
                        } as any
                    }
                }
            );
            console.log('Test Order 8 successfully updated to in_progress!');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
