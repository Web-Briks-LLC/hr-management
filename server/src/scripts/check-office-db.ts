import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.OFFICE_MONGO_URI;

async function check() {
    try {
        await mongoose.connect(uri as string);
        console.log('Connected to office DB');
        const db = mongoose.connection.db;
        if (!db) return;

        // Find users
        const qNames = [
            'Asaduzzaman Didar',
            'Md Moni mia',
            'Ayat Rana',
            'Lamia Tabassum',
        ];
        const users = await db
            .collection('user')
            .find({ name: { $in: qNames.map((n) => new RegExp(n, 'i')) } })
            .toArray();
        console.log(
            'Users:',
            users?.map((u) => ({ id: u._id, name: u.name })),
        );

        if (!users?.length) return process.exit(0);

        const userIds = users.map((u) => u._id);
        const staffs = await db
            .collection('staffs')
            .find({ userId: { $in: userIds } })
            .toArray();
        console.log(
            'Staffs:',
            staffs?.map((s) => ({ id: s._id, userId: s.userId })),
        );

        if (!staffs?.length) return process.exit(0);

        const staffIds = staffs.map((s) => s._id);

        // Check attendance for one of them
        const att = await db
            .collection('attendancedays')
            .find({ staffId: staffIds[0] })
            .sort({ date: -1 })
            .limit(10)
            .toArray();
        console.log(
            'Recent attendance for',
            users[0]?.name,
            ':',
            att?.map((a) => ({ date: a.date, status: a.status })),
        );
    } catch (error) {
        console.error('Connection error:', error);
        process.exit(1);
    }
}
check();
