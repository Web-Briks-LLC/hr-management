import mongoose from 'mongoose';

const MONGO_URI =
    'mongodb+srv://hrManagement:Oo0kwMllNlxfoDQb@hr-management.ntt3g.mongodb.net/hr-management?retryWrites=true&w=majority&appName=hr-management';

async function check() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected');

    const db = mongoose.connection.db;
    if (!db) {
        console.log('No db');
        return;
    }

    const count = await db.collection('profitdistributions').countDocuments();
    console.log('Distribution count:', count);

    const sample = await db.collection('profitdistributions').findOne();
    console.log('Sample:', JSON.stringify(sample, null, 2));

    await mongoose.disconnect();
    console.log('Done');
}

check();
