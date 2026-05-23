const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const startOfDay = new Date('2025-05-05T00:00:00.000Z');
const endOfDay = new Date('2025-05-05T23:59:59.999Z');

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection;

  // Earnings on May 5
  console.log('\n=== EARNINGS on May 5, 2025 ===');
  const earnings = await db.collection('earnings').find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();
  
  let totalEarningsBDT = 0;
  let totalEarningsUSD = 0;
  earnings.forEach((e, i) => {
    const bdtAmt = e.netAmountInBDT || 0;
    totalEarningsBDT += bdtAmt;
    totalEarningsUSD += e.totalAmount || 0;
    const time = e.createdAt ? e.createdAt.toISOString() : 'N/A';
    console.log(`${i+1}. Created: ${time} | Client: ${e.clientName || e.clientId || 'N/A'} | Amount: ${e.totalAmount || 0} ${e.currency || ''} | Net BDT: ${bdtAmt} | ConvRate: ${e.conversionRate || 'N/A'} | Status: ${e.status || 'N/A'} | Month: ${e.month || 'N/A'}/${e.year || 'N/A'}`);
  });
  console.log(`\nTotal Earnings: ${totalEarningsUSD} (original) | ${totalEarningsBDT} BDT`);

  // Expenses on May 5
  console.log('\n=== EXPENSES on May 5, 2025 ===');
  const expenses = await db.collection('expenses').find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();
  
  let totalExpenses = 0;
  expenses.forEach((e, i) => {
    totalExpenses += e.amount || 0;
    const time = e.createdAt ? e.createdAt.toISOString() : 'N/A';
    console.log(`${i+1}. Created: ${time} | Category: ${e.category || 'N/A'} | Desc: ${e.description || 'N/A'} | Amount: ${e.amount || 0} BDT | Status: ${e.status || 'N/A'}`);
  });
  console.log(`\nTotal Expenses: ${totalExpenses} BDT`);

  // Debits on May 5
  console.log('\n=== DEBITS on May 5, 2025 ===');
  const debits = await db.collection('debits').find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();
  let totalDebits = 0;
  debits.forEach((d, i) => {
    totalDebits += d.amount || 0;
    const time = d.createdAt ? d.createdAt.toISOString() : 'N/A';
    console.log(`${i+1}. Created: ${time} | Amount: ${d.amount} | Person: ${d.personName || 'N/A'} | Reason: ${(d.reason || '').substring(0, 50)} | Status: ${d.status || 'N/A'}`);
  });
  console.log(`\nTotal Debits: ${totalDebits} BDT`);

  // Profit Distributions on May 5
  console.log('\n=== PROFIT DISTRIBUTIONS on May 5, 2025 ===');
  const profits = await db.collection('profitdistributions').find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();
  let totalProfitDist = 0;
  profits.forEach((p, i) => {
    totalProfitDist += p.totalAmount || 0;
    const time = p.createdAt ? p.createdAt.toISOString() : 'N/A';
    const shares = (p.shares || []).map(s => `${s.shareholderName}: ${s.amount}`).join(', ');
    console.log(`${i+1}. Created: ${time} | Total: ${p.totalAmount} BDT | Shares: ${shares}`);
  });
  console.log(`\nTotal Profit Distributed: ${totalProfitDist} BDT`);

  // Profit Transfers on May 5
  console.log('\n=== PROFIT TRANSFERS on May 5, 2025 ===');
  const transfers = await db.collection('profittransfers').find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();
  let totalTransfers = 0;
  transfers.forEach((t, i) => {
    totalTransfers += t.amount || 0;
    const time = t.createdAt ? t.createdAt.toISOString() : 'N/A';
    console.log(`${i+1}. Created: ${time} | Amount: ${t.amount} | From: ${t.fromName || 'N/A'} -> To: ${t.toName || 'N/A'}`);
  });
  console.log(`\nTotal Transfers: ${totalTransfers} BDT`);

  // Wallet Transactions on May 5
  console.log('\n=== WALLET TRANSACTIONS on May 5, 2025 ===');
  const wallets = await db.collection('wallettransactions').find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();
  wallets.forEach((w, i) => {
    const time = w.createdAt ? w.createdAt.toISOString() : 'N/A';
    console.log(`${i+1}. Created: ${time} | Type: ${w.type} | Amount: ${w.amount} | Name: ${w.shareholderName || 'N/A'}`);
  });

  // Transactions ledger on May 5
  console.log('\n=== TRANSACTIONS LEDGER on May 5, 2025 ===');
  const transactions = await db.collection('transactions').find({
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ date: 1 }).toArray();

  let totalIn = 0, totalOut = 0;
  transactions.forEach((t, i) => {
    if (['earning', 'transfer_in'].includes(t.type)) totalIn += t.amount || 0;
    else totalOut += t.amount || 0;
    const time = t.date ? t.date.toISOString() : (t.createdAt ? t.createdAt.toISOString() : 'N/A');
    console.log(`${i+1}. Date: ${time} | Type: ${t.type} | Amount: ${t.amount} BDT | Desc: ${(t.description || '').substring(0, 80)}`);
  });
  console.log(`\nTransaction Ledger - Inflow: ${totalIn} BDT | Outflow: ${totalOut} BDT | Net: ${totalIn - totalOut} BDT`);

  // Final summary
  console.log('\n========================================');
  console.log('       MAY 5, 2025 DAILY SUMMARY       ');
  console.log('========================================');
  console.log(`Earnings:             ${earnings.length} entries | ${totalEarningsBDT} BDT`);
  console.log(`Expenses:             ${expenses.length} entries | ${totalExpenses} BDT`);
  console.log(`Debits:               ${debits.length} entries | ${totalDebits} BDT`);
  console.log(`Profit Distributions: ${profits.length} entries | ${totalProfitDist} BDT`);
  console.log(`Profit Transfers:     ${transfers.length} entries | ${totalTransfers} BDT`);
  console.log(`Wallet Transactions:  ${wallets.length} entries`);
  console.log(`Transaction Ledger:   ${transactions.length} entries`);
  console.log('----------------------------------------');
  console.log(`NET (Earnings - Expenses): ${totalEarningsBDT - totalExpenses} BDT`);
  console.log('========================================');

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
