import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || '';

async function checkAbsent() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const attColl = db?.collection('attendancedays');

        const count = await attColl?.countDocuments({
            status: 'absent',
            isAutoAbsent: true,
        });
        console.log(`Current Backfilled Absent Records: ${count}`);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

checkAbsent();
