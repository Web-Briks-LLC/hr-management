import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const uri = process.env.MONGO_URI;

async function findClient() {
    try {
        await mongoose.connect(uri!);
        const db = mongoose.connection.db;
        const clients = await db
            .collection('clients')
            .find({
                $or: [
                    { name: { $regex: 'Jamirul', $options: 'i' } },
                    { clientId: { $regex: 'Jamirul', $options: 'i' } },
                ],
            })
            .toArray();
        console.log('Found Clients:', clients);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
findClient();
