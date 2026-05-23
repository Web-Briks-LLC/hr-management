const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection;

  const startOfDay = new Date('2025-05-05T00:00:00.000Z');
  const endOfDay = new Date('2025-05-05T23:59:59.999Z');

  console.log('========================================================');
  console.log('     May 5, 2025 — FULL FINANCIAL REPORT (hr-management)');
  console.log('========================================================\n');

  // Get ALL transactions on May 5
  const transactions = await db.collection('transactions').find({
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ date: 1 }).toArray();

  // Separate by flow
  const inflows = transactions.filter(t => t.flow === 'inflow');
  const outflows = transactions.filter(t => t.flow === 'outflow');

  let totalInflow = 0, totalOutflow = 0;

  console.log('--- INFLOWS (Earnings / Incoming) ---');
  if (inflows.length === 0) {
    console.log('  (none)');
  } else {
    inflows.forEach((t, i) => {
      totalInflow += t.amountInBDT || t.amount || 0;
      const time = t.date ? new Date(t.date).toISOString() : 'N/A';
      console.log(`  ${i+1}. [${time}] ${t.sourceType || 'N/A'} | ${t.title || 'N/A'}`);
      console.log(`     Amount: ${t.amount} ${t.currency || 'BDT'} | BDT: ${t.amountInBDT || t.amount} | Status: ${t.status || 'N/A'}`);
      if (t.note) console.log(`     Note: ${t.note}`);
      console.log('');
    });
  }
  console.log(`  TOTAL INFLOW: ${totalInflow.toLocaleString()} BDT\n`);

  console.log('--- OUTFLOWS (Expenses / Debits / Shared / Transfers) ---');
  if (outflows.length === 0) {
    console.log('  (none)');
  } else {
    outflows.forEach((t, i) => {
      totalOutflow += t.amountInBDT || t.amount || 0;
      const time = t.date ? new Date(t.date).toISOString() : 'N/A';
      console.log(`  ${i+1}. [${time}] ${t.sourceType || 'N/A'} | ${t.title || 'N/A'}`);
      console.log(`     Amount: ${t.amount} ${t.currency || 'BDT'} | BDT: ${t.amountInBDT || t.amount} | Status: ${t.status || 'N/A'}`);
      if (t.note) console.log(`     Note: ${t.note}`);
      console.log('');
    });
  }
  console.log(`  TOTAL OUTFLOW: ${totalOutflow.toLocaleString()} BDT\n`);

  // Also check source documents for more detail
  console.log('--- SOURCE DOCUMENT DETAILS ---');
  for (const t of transactions) {
    if (t.sourceId && t.sourceType) {
      let collName = '';
      if (t.sourceType === 'earning') collName = 'earnings';
      else if (t.sourceType === 'expense') collName = 'expenses';
      else if (t.sourceType === 'debit') collName = 'debits';
      else if (t.sourceType === 'shared') collName = 'profitdistributions';
      else if (t.sourceType === 'transfer') collName = 'profittransfers';
      else if (t.sourceType === 'wallet_withdrawal') collName = 'wallettransactions';

      if (collName) {
        try {
          const source = await db.collection(collName).findOne({ _id: new mongoose.Types.ObjectId(t.sourceId) });
          if (source) {
            const created = source.createdAt ? new Date(source.createdAt).toISOString() : 'N/A';
            console.log(`  [${t.sourceType}] ID: ${t.sourceId}`);
            console.log(`    DB CreatedAt: ${created}`);
            if (t.sourceType === 'expense') {
              console.log(`    Category: ${source.category || 'N/A'}`);
              console.log(`    Description: ${source.description || 'N/A'}`);
              console.log(`    Amount: ${source.amount} BDT`);
              console.log(`    Status: ${source.status || 'N/A'}`);
              console.log(`    ExpenseDate: ${source.date ? new Date(source.date).toISOString() : 'N/A'}`);
            } else if (t.sourceType === 'earning') {
              console.log(`    Client: ${source.clientName || source.clientId || 'N/A'}`);
              console.log(`    TotalAmount: ${source.totalAmount} ${source.currency}`);
              console.log(`    NetBDT: ${source.netAmountInBDT}`);
              console.log(`    Status: ${source.status}`);
              console.log(`    Month/Year: ${source.month}/${source.year}`);
            }
            console.log('');
          }
        } catch(e) { /* skip */ }
      }
    }
  }

  console.log('========================================================');
  console.log('               MAY 5, 2025 — FINAL SUMMARY             ');
  console.log('========================================================');
  console.log(`  Total Transactions:  ${transactions.length}`);
  console.log(`  Inflows:             ${inflows.length} entries | ${totalInflow.toLocaleString()} BDT`);
  console.log(`  Outflows:            ${outflows.length} entries | ${totalOutflow.toLocaleString()} BDT`);
  console.log(`  ──────────────────────────────────────────────────`);
  console.log(`  NET for the day:     ${(totalInflow - totalOutflow).toLocaleString()} BDT`);
  console.log('========================================================');

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
