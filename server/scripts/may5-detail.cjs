const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection;

  const startOfDay = new Date('2025-05-05T00:00:00.000Z');
  const endOfDay = new Date('2025-05-05T23:59:59.999Z');

  // Get first transaction to see all field names
  console.log('=== SAMPLE TRANSACTION STRUCTURE ===');
  const sample = await db.collection('transactions').findOne({ date: { $gte: startOfDay, $lte: endOfDay }});
  console.log(JSON.stringify(sample, null, 2));

  // Also check if earnings have different date field
  console.log('\n=== CHECK EARNINGS by different date fields ===');
  const earningsByDate = await db.collection('earnings').find({
    $or: [
      { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      { date: { $gte: startOfDay, $lte: endOfDay } },
      { paidAt: { $gte: startOfDay, $lte: endOfDay } },
    ]
  }).toArray();
  console.log(`Found ${earningsByDate.length} earnings`);
  if (earningsByDate.length > 0) {
    console.log('Sample:', JSON.stringify(earningsByDate[0], null, 2));
  }

  // Check total count of earnings
  const totalEarnings = await db.collection('earnings').countDocuments();
  console.log(`\nTotal earnings in DB: ${totalEarnings}`);

  // Check earnings around May 5 (broader range)
  const broadStart = new Date('2025-05-01T00:00:00.000Z');
  const broadEnd = new Date('2025-05-10T23:59:59.999Z');
  const earningsInRange = await db.collection('earnings').find({
    createdAt: { $gte: broadStart, $lte: broadEnd }
  }).sort({ createdAt: 1 }).toArray();
  console.log(`\nEarnings May 1-10: ${earningsInRange.length}`);
  earningsInRange.forEach((e, i) => {
    console.log(`${i+1}. ${e.createdAt.toISOString()} | ${e.totalAmount || 0} ${e.currency || ''} | BDT: ${e.netAmountInBDT || 0} | Status: ${e.status}`);
  });

  // Same for expenses
  const expensesInRange = await db.collection('expenses').find({
    createdAt: { $gte: broadStart, $lte: broadEnd }
  }).sort({ createdAt: 1 }).toArray();
  console.log(`\nExpenses May 1-10: ${expensesInRange.length}`);
  expensesInRange.forEach((e, i) => {
    console.log(`${i+1}. ${e.createdAt.toISOString()} | ${e.amount || 0} BDT | ${e.category || ''} | ${e.description || ''}`);
  });

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
