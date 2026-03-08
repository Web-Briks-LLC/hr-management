import { MongoClient } from 'mongodb';

async function list() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('hr-management');
        const earnings = db.collection('earnings');
        
        const all = await earnings.find({}).sort({ updatedAt: -1 }).limit(10).toArray();
        all.forEach(e => {
            console.log(`ID: ${e._id}, Month: ${e.month}, Year: ${e.year}, Total: ${e.totalAmount}, Status: ${e.status}`);
        });
    } finally {
        await client.close();
    }
}

list().catch(console.error);
