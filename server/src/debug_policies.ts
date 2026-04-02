import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    const db = mongoose.connection.db!;
    const users = await db.collection('user').find({ email: 'fuyadhasanfahim0@gmail.com' }).toArray();
    console.log('--- USER ---');
    console.log(JSON.stringify(users, null, 2));

    const firstUser = users[0];
    if (firstUser) {
        const staff = await db.collection('staffs').find({ userId: firstUser._id }).toArray();
        console.log('--- STAFF ---');
        console.log(JSON.stringify(staff, null, 2));
    }

    const policies = await db.collection('policies').find().sort({ createdAt: -1 }).toArray();
    console.log('--- POLICIES (RECENT) ---');
    console.log(JSON.stringify(policies.slice(0, 5), (key, value) => 
        (key === 'description' && value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : value), 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
main();
