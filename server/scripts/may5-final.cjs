const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection;

  const endOfMay5 = new Date('2026-05-05T23:59:59.999Z');
  const startOfMay5 = new Date('2026-05-05T00:00:00.000Z');

  // ─── 1. ALL transactions up to end of May 5 ───
  const allTxns = await db.collection('transactions').find({
    date: { $lte: endOfMay5 }
  }).sort({ date: 1 }).toArray();

  let cumulativeInflow = 0;
  let cumulativeOutflow = 0;

  // Group by sourceType
  const byType = {};

  allTxns.forEach(t => {
    const amt = t.amountInBDT || t.amount || 0;
    const st = t.sourceType || 'unknown';
    if (!byType[st]) byType[st] = { inflow: 0, outflow: 0, count: 0 };
    byType[st].count++;

    if (t.flow === 'inflow') {
      cumulativeInflow += amt;
      byType[st].inflow += amt;
    } else {
      cumulativeOutflow += amt;
      byType[st].outflow += amt;
    }
  });

  console.log('================================================================');
  console.log('  CUMULATIVE FINANCIAL REPORT — Up to May 5, 2026 (inclusive)');
  console.log('================================================================\n');

  console.log('--- BREAKDOWN BY SOURCE TYPE ---');
  console.log('Type                | Count | Inflow (BDT)     | Outflow (BDT)');
  console.log('--------------------+-------+------------------+-----------------');
  for (const [type, data] of Object.entries(byType)) {
    console.log(`${type.padEnd(20)}| ${String(data.count).padEnd(6)}| ${data.inflow.toLocaleString().padStart(16)} | ${data.outflow.toLocaleString().padStart(16)}`);
  }
  console.log('--------------------+-------+------------------+-----------------');
  console.log(`${'TOTAL'.padEnd(20)}| ${String(allTxns.length).padEnd(6)}| ${cumulativeInflow.toLocaleString().padStart(16)} | ${cumulativeOutflow.toLocaleString().padStart(16)}`);

  console.log(`\n  FINAL BALANCE as of May 5, 2026 EOD: ${(cumulativeInflow - cumulativeOutflow).toLocaleString()} BDT\n`);

  // ─── 2. Day-by-day for May 1-5 to show progression ───
  console.log('--- DAILY PROGRESSION (May 1–5, 2026) ---');
  let runningBalance = 0;
  // First get balance up to Apr 30
  const endOfApr30 = new Date('2026-04-30T23:59:59.999Z');
  const preMayTxns = await db.collection('transactions').find({
    date: { $lte: endOfApr30 }
  }).toArray();

  let preMayIn = 0, preMayOut = 0;
  preMayTxns.forEach(t => {
    const amt = t.amountInBDT || t.amount || 0;
    if (t.flow === 'inflow') preMayIn += amt;
    else preMayOut += amt;
  });
  runningBalance = preMayIn - preMayOut;
  console.log(`  Before May 1:  Balance = ${runningBalance.toLocaleString()} BDT (${preMayTxns.length} txns total)`);

  for (let day = 1; day <= 5; day++) {
    const ds = new Date(`2026-05-${String(day).padStart(2,'0')}T00:00:00.000Z`);
    const de = new Date(`2026-05-${String(day).padStart(2,'0')}T23:59:59.999Z`);
    const dayTxns = await db.collection('transactions').find({
      date: { $gte: ds, $lte: de }
    }).sort({ date: 1 }).toArray();

    let dayIn = 0, dayOut = 0;
    dayTxns.forEach(t => {
      const amt = t.amountInBDT || t.amount || 0;
      if (t.flow === 'inflow') dayIn += amt;
      else dayOut += amt;
    });
    runningBalance += (dayIn - dayOut);
    console.log(`  May ${day}:         +${dayIn.toLocaleString()} / -${dayOut.toLocaleString()} (${dayTxns.length} txns) => Balance: ${runningBalance.toLocaleString()} BDT`);
  }

  // ─── 3. Detailed May 5 transactions ───
  console.log('\n--- MAY 5, 2026 — DETAILED TRANSACTIONS (Time = BD +6) ---\n');
  const may5Txns = await db.collection('transactions').find({
    date: { $gte: startOfMay5, $lte: endOfMay5 }
  }).sort({ date: 1 }).toArray();

  let dayRunning = runningBalance - may5Txns.reduce((sum, t) => {
    const amt = t.amountInBDT || t.amount || 0;
    return sum + (t.flow === 'inflow' ? amt : -amt);
  }, 0);

  console.log(`  Opening Balance (start of May 5): ${dayRunning.toLocaleString()} BDT\n`);

  may5Txns.forEach((t, i) => {
    const amt = t.amountInBDT || t.amount || 0;
    if (t.flow === 'inflow') dayRunning += amt;
    else dayRunning -= amt;
    
    const utcDate = new Date(t.date);
    const bdHour = (utcDate.getUTCHours() + 6) % 24;
    const bdMin = String(utcDate.getUTCMinutes()).padStart(2, '0');
    const bdSec = String(utcDate.getUTCSeconds()).padStart(2, '0');
    const ampm = bdHour >= 12 ? 'PM' : 'AM';
    const h12 = bdHour === 0 ? 12 : bdHour > 12 ? bdHour - 12 : bdHour;
    const bdTime = `${h12}:${bdMin}:${bdSec} ${ampm}`;

    const arrow = t.flow === 'inflow' ? '  ▲ IN ' : '  ▼ OUT';
    console.log(`  ${i+1}. ${bdTime}  ${arrow}  ${amt.toLocaleString()} BDT`);
    console.log(`     ${t.title || 'N/A'}`);
    console.log(`     Running Balance: ${dayRunning.toLocaleString()} BDT`);
    console.log('');
  });

  console.log('================================================================');
  console.log('                    FINAL SUMMARY — May 5, 2026');
  console.log('================================================================');
  console.log(`  Total Transactions (all time up to May 5):  ${allTxns.length}`);
  console.log(`  Cumulative Inflow:   ${cumulativeInflow.toLocaleString()} BDT`);
  console.log(`  Cumulative Outflow:  ${cumulativeOutflow.toLocaleString()} BDT`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  FINAL AMOUNT (May 5, 2026 EOD): ${(cumulativeInflow - cumulativeOutflow).toLocaleString()} BDT`);
  console.log('================================================================');

  // ─── 4. Also check monthly earnings for context ───
  console.log('\n--- MONTHLY EARNINGS SUMMARY (up to May 2026) ---');
  const earningsPipeline = [
    { $match: { status: 'paid' } },
    { $group: {
      _id: { month: '$month', year: '$year' },
      totalBDT: { $sum: '$netAmountInBDT' },
      totalOriginal: { $sum: '$totalAmount' },
      count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ];
  const monthlyEarnings = await db.collection('earnings').aggregate(earningsPipeline).toArray();
  monthlyEarnings.forEach(m => {
    if (m._id.year <= 2026 && (m._id.year < 2026 || m._id.month <= 5)) {
      console.log(`  ${m._id.month}/${m._id.year}: ${m.count} entries | ${m.totalBDT.toLocaleString()} BDT`);
    }
  });

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
