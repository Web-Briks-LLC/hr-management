import { MongoClient, ObjectId } from 'mongodb';

const uri = "mongodb+srv://admin:0gp4SvbU092p1rDS@cluster0.atzq3rl.mongodb.net/hr-management?appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('hr-management');
    
    console.log("Connected successfully to DB");
    
    const staffId = new ObjectId('698790e0d684daba767b88ea');
    const staffIdStr = '698790e0d684daba767b88ea';
    
    // Fetch categories
    const categories = await db.collection('expensecategories').find({}).toArray();
    const catMap = {};
    categories.forEach(c => {
      catMap[c._id.toString()] = c.name;
    });

    console.log("\n--- Direct Expenses for Fuyad ---");
    const directExpenses = await db.collection('expenses').find({ staffId: staffId }).toArray();
    directExpenses.forEach(e => {
      console.log({
        _id: e._id,
        date: e.date,
        title: e.title,
        category: catMap[e.categoryId?.toString()] || e.categoryId,
        amount: e.amount,
        status: e.status,
        billingMonth: e.billingMonth,
        billingYear: e.billingYear,
        note: e.note
      });
    });

    console.log("\n--- Bulk Expenses ---");
    const bulkExpenses = await db.collection('expenses').find({ staffId: null }).toArray();
    bulkExpenses.forEach(e => {
      const note = e.note || '';
      if (note.includes(staffIdStr)) {
        console.log({
          _id: e._id,
          date: e.date,
          title: e.title,
          category: catMap[e.categoryId?.toString()] || e.categoryId,
          amount: e.amount,
          status: e.status,
          billingMonth: e.billingMonth,
          billingYear: e.billingYear,
          note: e.note
        });
      }
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
