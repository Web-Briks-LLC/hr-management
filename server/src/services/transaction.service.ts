import { startOfDay, endOfDay } from "date-fns";
import mongoose from "mongoose";
import puppeteer from "puppeteer";
import EarningModel from "../models/earning.model.js";
import ExpenseModel from "../models/expense.model.js";
import DebitModel, { DebitType } from "../models/Debit.js";
import ProfitTransferModel from "../models/profit-transfer.model.js";
import ProfitDistributionModel from "../models/profit-distribution.model.js";
import type {
    INormalizedTransaction,
    TransactionQueryParams,
    ITransactionReportData,
} from "../types/transaction.type.js";

// Helper to format currency values to BDT
const formatBDT = (amount: number) => {
    return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const buildDynamicDateFilter = (dateField: string, filterMode: 'lt' | 'range', sortByDate: 'createdAt' | 'date', start?: Date, end?: Date) => {
    const targetField = sortByDate === 'createdAt' ? 'createdAt' : dateField;
    
    if (filterMode === 'lt') {
        return [
            { [targetField]: { $lt: start } },
            { [targetField]: null, createdAt: { $lt: start } },
            { [targetField]: { $exists: false }, createdAt: { $lt: start } }
        ];
    } else {
        return [
            { [targetField]: { $gte: start, $lte: end } },
            { [targetField]: null, createdAt: { $gte: start, $lte: end } },
            { [targetField]: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
    }
};

const getTransactionDate = (legacyDate: Date | string | undefined | null, createdAt: Date | string | undefined | null, sortByDate: 'createdAt' | 'date') => {
    if (sortByDate === 'createdAt' && createdAt) {
        return new Date(createdAt);
    }
    return legacyDate ? new Date(legacyDate) : (createdAt ? new Date(createdAt) : new Date());
};

// Main Unified Query & Calculation Logic
async function getUnifiedTransactions(params: TransactionQueryParams): Promise<ITransactionReportData> {
    const now = new Date();
    
    // 1. Date Range Handling
    const isAllTime = !params.startDate && !params.endDate;
    const start = params.startDate ? startOfDay(new Date(params.startDate)) : new Date(0);
    const end = params.endDate ? endOfDay(new Date(params.endDate)) : endOfDay(now);

    let openingBalance = 0;

    // 2. STEP 1: CALCULATE CUMULATIVE OPENING BALANCE (everything strictly before 'start')
    // Only calculated if not in All Time mode (since opening balance is 0 at the beginning of time)
    if (!isAllTime) {
        const [
            earningsBefore,
            debitBorrowsBefore,
            debitReturnsBefore,
            expensesBefore,
            transfersBefore,
            distributionsBefore
        ] = await Promise.all([
            // Inflows before 'start'
            EarningModel.aggregate([
                {
                    $match: {
                        status: "paid",
                        $or: buildDynamicDateFilter("paidAt", "lt", params.sortByDate || "createdAt", start)
                    }
                },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$paidAmountBDT", "$amountInBDT"] } } } }
            ]),
            DebitModel.aggregate([
                {
                    $match: {
                        type: DebitType.BORROW,
                        $or: buildDynamicDateFilter("date", "lt", params.sortByDate || "createdAt", start)
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Outflows before 'start'
            DebitModel.aggregate([
                {
                    $match: {
                        type: DebitType.RETURN,
                        $or: buildDynamicDateFilter("date", "lt", params.sortByDate || "createdAt", start)
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            ExpenseModel.aggregate([
                {
                    $match: {
                        status: { $in: ["paid", "partial_paid"] },
                        $or: buildDynamicDateFilter("date", "lt", params.sortByDate || "createdAt", start)
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            ProfitTransferModel.aggregate([
                {
                    $match: {
                        $or: buildDynamicDateFilter("transferDate", "lt", params.sortByDate || "createdAt", start)
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            ProfitDistributionModel.aggregate([
                {
                    $match: {
                        status: "distributed",
                        $or: buildDynamicDateFilter("distributedAt", "lt", params.sortByDate || "createdAt", start)
                    }
                },
                { $group: { _id: null, total: { $sum: "$shareAmount" } } }
            ])
        ]);

        const sumEarningsBefore = earningsBefore[0]?.total || 0;
        const sumDebitBorrowsBefore = debitBorrowsBefore[0]?.total || 0;
        const sumDebitReturnsBefore = debitReturnsBefore[0]?.total || 0;
        const sumExpensesBefore = expensesBefore[0]?.total || 0;
        const sumTransfersBefore = transfersBefore[0]?.total || 0;
        const sumDistributionsBefore = distributionsBefore[0]?.total || 0;

        openingBalance = (sumEarningsBefore + sumDebitBorrowsBefore) - 
                         (sumExpensesBefore + sumTransfersBefore + sumDistributionsBefore + sumDebitReturnsBefore);
    }

    // 3. STEP 2: FETCH RANGE DATA (to ensure chronological running balance continuity)
    const earningRangeFilter: any = { status: "paid" };
    const expenseRangeFilter: any = { status: { $in: ["paid", "partial_paid"] } };
    const debitRangeFilter: any = {};
    const distributionRangeFilter: any = { status: "distributed" };
    const transferRangeFilter: any = {};

    if (!isAllTime) {
        earningRangeFilter.$or = buildDynamicDateFilter("paidAt", "range", params.sortByDate || "createdAt", start, end);
        expenseRangeFilter.$or = buildDynamicDateFilter("date", "range", params.sortByDate || "createdAt", start, end);
        debitRangeFilter.$or = buildDynamicDateFilter("date", "range", params.sortByDate || "createdAt", start, end);
        distributionRangeFilter.$or = buildDynamicDateFilter("distributedAt", "range", params.sortByDate || "createdAt", start, end);
        transferRangeFilter.$or = buildDynamicDateFilter("transferDate", "range", params.sortByDate || "createdAt", start, end);
    }

    const [
        earnings,
        expenses,
        debits,
        distributions,
        transfers
    ] = await Promise.all([
        EarningModel.find(earningRangeFilter).populate("clientId").lean(),
        ExpenseModel.find(expenseRangeFilter).populate("categoryId").lean(),
        DebitModel.find(debitRangeFilter).populate("personId").lean(),
        ProfitDistributionModel.find(distributionRangeFilter).populate("shareholderId").lean(),
        ProfitTransferModel.find(transferRangeFilter).populate("businessId").lean()
    ]);

    const rawTransactions: INormalizedTransaction[] = [];

    // A. Earnings (Inflow)
    earnings.forEach(e => {
        rawTransactions.push({
            id: e._id.toString(),
            date: getTransactionDate(e.paidAt, e.createdAt, params.sortByDate || "createdAt"),
            title: `Revenue Earning: ${(e.clientId as any)?.name || e.legacyClientCode || "Client"}`,
            type: "earning",
            amount: e.totalAmount,
            currency: e.currency,
            amountInBDT: e.paidAmountBDT || e.amountInBDT || 0,
            flow: "inflow",
            status: "paid",
            referenceId: (e.clientId as any)?._id?.toString() || e.clientId?.toString(),
            note: e.notes,
            createdBy: e.createdBy,
            createdAt: e.createdAt
        } as any as INormalizedTransaction);
    });

    // B. Expenses (Outflow)
    expenses.forEach(ex => {
        rawTransactions.push({
            id: ex._id.toString(),
            date: getTransactionDate(ex.date, (ex as any).createdAt, params.sortByDate || "createdAt"),
            title: `Expense: ${ex.title} (${(ex.categoryId as any)?.name || "Uncategorized"})`,
            type: "expense",
            amount: ex.amount,
            currency: "BDT",
            amountInBDT: ex.amount,
            flow: "outflow",
            status: ex.status as any,
            referenceId: ex.branchId?.toString(),
            note: ex.note,
            createdBy: ex.createdBy,
            createdAt: (ex as any).createdAt
        } as any as INormalizedTransaction);
    });

    // C. Debits (Borrow is Inflow, Return is Outflow)
    debits.forEach(d => {
        rawTransactions.push({
            id: d._id.toString(),
            date: getTransactionDate(d.date, (d as any).createdAt, params.sortByDate || "createdAt"),
            title: `Debit ${d.type}: ${(d.personId as any)?.name || "Unknown Person"}`,
            type: "debit",
            subType: d.type,
            amount: d.amount,
            currency: "BDT",
            amountInBDT: d.amount,
            flow: d.type === DebitType.BORROW ? "inflow" : "outflow",
            status: "completed" as any,
            referenceId: (d.personId as any)?._id?.toString() || d.personId?.toString(),
            note: d.description,
            createdBy: d.createdBy,
            createdAt: (d as any).createdAt
        } as any as INormalizedTransaction);
    });

    // D. Profit Distributions (Outflow)
    distributions.forEach(d => {
        rawTransactions.push({
            id: d._id.toString(),
            date: getTransactionDate(d.distributedAt, (d as any).createdAt, params.sortByDate || "createdAt"),
            title: `Profit Distributed to ${(d.shareholderId as any)?.name || "Shareholder"}`,
            type: "profit_share",
            amount: d.shareAmount,
            currency: "BDT",
            amountInBDT: d.shareAmount,
            flow: "outflow",
            status: "distributed",
            referenceId: (d.shareholderId as any)?._id?.toString() || d.shareholderId?.toString(),
            note: d.notes,
            createdBy: d.distributedBy,
            createdAt: (d as any).createdAt
        } as any as INormalizedTransaction);
    });

    // E. Profit Transfers (Outflow)
    transfers.forEach(t => {
        rawTransactions.push({
            id: t._id.toString(),
            date: getTransactionDate(t.transferDate, (t as any).createdAt, params.sortByDate || "createdAt"),
            title: `Capital Transfer to ${(t.businessId as any)?.name || "Business"}`,
            type: "profit_transfer",
            amount: t.amount,
            currency: "BDT",
            amountInBDT: t.amount,
            flow: "outflow",
            status: "completed" as any,
            referenceId: (t.businessId as any)?._id?.toString() || t.businessId?.toString(),
            note: t.notes,
            createdBy: t.transferredBy,
            createdAt: (t as any).createdAt
        } as any as INormalizedTransaction);
    });

    // Fetch and map user details (createdBy) directly from better-auth user collection
    const rawCreatorIds: string[] = [];
    rawTransactions.forEach(tx => {
        if (!tx.createdBy) return;
        if (typeof tx.createdBy === "string") {
            rawCreatorIds.push(tx.createdBy);
        } else if (typeof tx.createdBy === "object" && (tx.createdBy as any)._id) {
            rawCreatorIds.push((tx.createdBy as any)._id.toString());
        } else {
            const str = tx.createdBy.toString();
            if (str && str.length > 0) {
                rawCreatorIds.push(str);
            }
        }
    });

    const creatorIds = Array.from(new Set(rawCreatorIds));

    if (creatorIds.length > 0) {
        try {
            const queryIds: any[] = [...creatorIds];
            creatorIds.forEach(id => {
                if (mongoose.Types.ObjectId.isValid(id)) {
                    queryIds.push(new mongoose.Types.ObjectId(id));
                }
            });

            const dbUsers = await mongoose.connection.collection("user").find({
                _id: { $in: queryIds }
            }).toArray();

            const usersMap = new Map<string, { _id: string; name: string }>();
            dbUsers.forEach(u => {
                const idStr = u._id.toString();
                usersMap.set(idStr, {
                    _id: idStr,
                    name: u.name || u.username || "User"
                });
            });

            rawTransactions.forEach(tx => {
                if (tx.createdBy) {
                    const key = typeof tx.createdBy === "string" 
                        ? tx.createdBy 
                        : (typeof tx.createdBy === "object" && (tx.createdBy as any)._id)
                            ? (tx.createdBy as any)._id.toString()
                            : tx.createdBy.toString();
                    
                  if (usersMap.has(key)) {
                      tx.createdBy = usersMap.get(key)!;
                  }
                }
            });
        } catch (err) {
            console.error("Error populating raw users:", err);
        }
    }

    // 4. STEP 3: SORT CHRONOLOGICALLY (ASCENDING) TO COMPUTE RUNNING BALANCE CORRECTLY
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingBalance;

    const processedTransactions = rawTransactions.map(tx => {
        if (tx.flow === "inflow") {
            running += tx.amountInBDT;
        } else {
            running -= tx.amountInBDT;
        }
        tx.runningBalance = running;
        return tx;
    });

    // 5. STEP 4: APPLY IN-MEMORY FILTERS
    let filteredTransactions = processedTransactions;

    // A. Filter by Type
    if (params.type) {
        const activeTypes = params.type.split(",").map(t => t.trim().toLowerCase());
        filteredTransactions = filteredTransactions.filter(tx => activeTypes.includes(tx.type));
    }

    // B. Filter by Branch (only applies to expenses)
    if (params.branchId) {
        filteredTransactions = filteredTransactions.filter(tx => {
            if (tx.type === "expense") {
                return tx.referenceId === params.branchId;
            }
            return true; // Keep other global types
        });
    }

    // C. Filter by Search Query
    if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredTransactions = filteredTransactions.filter(tx => {
            return (
                tx.title.toLowerCase().includes(searchLower) ||
                (tx.note && tx.note.toLowerCase().includes(searchLower))
            );
        });
    }

    // Calculate dynamic range stats based on filtered list
    let totalInflow = 0;
    let totalOutflow = 0;

    filteredTransactions.forEach(tx => {
        if (tx.flow === "inflow") {
            totalInflow += tx.amountInBDT;
        } else {
            totalOutflow += tx.amountInBDT;
        }
    });

    const netChange = totalInflow - totalOutflow;
    const closingBalance = openingBalance + netChange;

    // 6. STEP 5: SORT FOR DISPLAY (DESCENDING CHRONOLOGICAL)
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        summary: {
            openingBalance,
            totalInflow,
            totalOutflow,
            netChange,
            closingBalance,
        },
        transactions: filteredTransactions,
    };
}

// Puppeteer HTML Template Compiler
function compileReportHTML(data: ITransactionReportData, startDate: string, endDate: string): string {
    const { summary, transactions } = data;
    const dateFormatted = (dateInput: Date | string) => {
        const d = new Date(dateInput);
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    };

    const tableRows = transactions.map((t) => {
        const typeLabel = t.type.toUpperCase().replace("_", " ");
        const flowSign = t.flow === "inflow" ? "+" : "-";
        const flowClass = t.flow === "inflow" ? "inflow" : "outflow";
        
        return `
            <tr>
                <td class="font-mono">${dateFormatted(t.date)}</td>
                <td>
                    <div class="description-cell">
                        <div class="description-title" title="${t.title}">${t.title}</div>
                        ${t.note ? `<div class="description-note" title="${t.note}">${t.note}</div>` : ""}
                    </div>
                </td>
                <td><span class="badge badge-${t.type}">${typeLabel}</span></td>
                <td class="${flowClass} text-right font-mono">${flowSign} ${formatBDT(t.amountInBDT)}</td>
                <td class="text-right font-mono" style="font-weight: 500; color: #111827;">${formatBDT(t.runningBalance || 0)}</td>
            </tr>
        `;
    }).join("");

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Unified Financial Ledger - ${startDate} to ${endDate}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 13px;
                font-weight: 400;
                color: #111827;
                background: #FFFFFF;
                padding: 40px;
                line-height: 1.5;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            /* ── Header ─────────────────────────── */

            .report-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                padding-bottom: 24px;
                margin-bottom: 40px;
                border-bottom: 1px solid #E5E7EB;
            }
            
            .header-left .brand {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: #1E0078; /* Accent */
                margin-bottom: 8px;
                display: block;
            }
            
            .header-left h1 {
                font-size: 24px;
                font-weight: 600;
                color: #111827;
                letter-spacing: -0.02em;
                line-height: 1.2;
            }

            .header-right {
                text-align: right;
                font-size: 12px;
                color: #6B7280;
                line-height: 1.6;
            }
            
            .header-right strong {
                color: #111827;
                font-weight: 500;
            }

            /* ── Financial Summary ────────────── */

            .summary-container {
                margin-bottom: 40px;
                max-width: 380px;
            }
            
            .summary-title {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: #6B7280;
                margin-bottom: 12px;
            }

            .summary-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .summary-table td {
                padding: 10px 0;
                font-size: 13px;
                color: #111827;
                border-bottom: 1px solid #E5E7EB;
            }
            
            .summary-table td.label {
                color: #6B7280;
            }
            
            .summary-table td.value {
                text-align: right;
                font-weight: 500;
            }

            .summary-table tr.total-row td {
                border-bottom: 3px double #111827;
                font-weight: 600;
                color: #111827;
                padding-top: 12px;
                padding-bottom: 12px;
            }
            
            .summary-table tr.total-row td.label {
                color: #111827;
            }
            
            .summary-table tr.total-row td.value {
                color: #1E0078; /* Positive gets accent */
                font-weight: 700;
            }

            /* ── Sections & Tables ─────────────── */

            .section-title {
                font-size: 14px;
                font-weight: 600;
                color: #111827;
                letter-spacing: -0.01em;
                margin-bottom: 16px;
                page-break-after: avoid;
            }

            table.data-table {
                width: 100%;
                border-collapse: collapse;
                border-spacing: 0;
                table-layout: fixed;
            }
            
            table.data-table th {
                padding: 10px 12px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: #6B7280;
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
                text-align: left;
            }
            
            table.data-table td {
                padding: 12px;
                font-size: 12px;
                color: #111827;
                border: 1px solid #E5E7EB;
                background: #FFFFFF;
            }
            
            table.data-table tbody tr {
                page-break-inside: avoid;
            }

            .description-cell {
                width: 100%;
                overflow: hidden;
            }
            
            .description-title {
                font-weight: 500;
                color: #111827;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .description-note {
                font-size: 11px;
                color: #6B7280;
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* ── Utilities ───────────────────── */

            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .font-mono {
                font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
                font-variant-numeric: tabular-nums;
            }
            .inflow {
                color: #137333;
                font-weight: 500;
            }
            .outflow {
                color: #C5221F;
                font-weight: 500;
            }
            
            .badge {
                display: inline-block;
                padding: 3px 8px;
                font-size: 9px;
                font-weight: 600;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .badge-earning { background: #E6F4EA; color: #137333; }
            .badge-expense { background: #FCE8E6; color: #C5221F; }
            .badge-debit { background: #FEF7E0; color: #B06000; }
            .badge-wallet { background: #F1F3F4; color: #3C4043; }
            .badge-profit_share { background: #F3E8FD; color: #681DA8; }
            .badge-profit_transfer { background: #E8F0FE; color: #1A73E8; }

            /* ── Footer ──────────────────────── */

            .report-footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #E5E7EB;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: #6B7280;
            }
            
            .footer-brand {
                font-weight: 600;
                color: #111827;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }

            /* ── Print ───────────────────────── */

            @media print {
                body { padding: 0; }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>

        <!-- Header -->
        <header class="report-header">
            <div class="header-left">
                <span class="brand">HR Management</span>
                <h1>Unified Financial Ledger Report</h1>
            </div>
            <div class="header-right">
                <div>Period: <strong>${startDate}</strong> to <strong>${endDate}</strong></div>
                <div>Generated: <strong>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
            </div>
        </header>

        <!-- Financial Summary (Statement Style) -->
        <section class="summary-container">
            <h3 class="summary-title">Financial Summary</h3>
            <table class="summary-table">
                <tbody>
                    <tr>
                        <td class="label">Opening Balance</td>
                        <td class="value font-mono">BDT ${formatBDT(summary.openingBalance)}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Inflow</td>
                        <td class="value font-mono">+ BDT ${formatBDT(summary.totalInflow)}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Outflow</td>
                        <td class="value font-mono">(BDT ${formatBDT(summary.totalOutflow)})</td>
                    </tr>
                    <tr>
                        <td class="label">Net Change</td>
                        <td class="value font-mono ${summary.netChange < 0 ? 'outflow' : 'inflow'}">
                            ${summary.netChange >= 0 ? '+' : '-'} BDT ${formatBDT(Math.abs(summary.netChange))}
                        </td>
                    </tr>
                    <tr class="total-row">
                        <td class="label">Closing Balance</td>
                        <td class="value font-mono">BDT ${formatBDT(summary.closingBalance)}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- Ledger Table Section -->
        <div>
            <h2 class="section-title">Transactions List</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Date</th>
                        <th style="width: 43%;">Description</th>
                        <th style="width: 15%;">Type</th>
                        <th style="width: 13%; text-align: right;">Amount (BDT)</th>
                        <th style="width: 14%; text-align: right;">Balance (BDT)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || `<tr><td colspan="5" class="text-center" style="color: #6B7280; font-style: italic; padding: 40px 10px;">No transactions available for this period.</td></tr>`}
                </tbody>
            </table>
        </div>

    </body>
    </html>
    `;
}

// Puppeteer Render PDF Logic
async function generatePDFBuffer(data: ITransactionReportData, startDate: string, endDate: string): Promise<Buffer> {
    const htmlContent = compileReportHTML(data, startDate, endDate);
    
    const launchOptions: any = {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    };

    if (process.platform === "linux") {
        launchOptions.executablePath = "/usr/bin/google-chrome";
    }

    // Launch headless Chromium via Puppeteer
    const browser = await puppeteer.launch(launchOptions);

    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
        
        // Print page to A4 PDF with letter Margins and Page Number footers
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm",
            },
            displayHeaderFooter: true,
            headerTemplate: "<div></div>", // Empty header
            footerTemplate: `
                <div style="font-family: Arial, sans-serif; font-size: 8px; color: #a0aec0; width: 100%; border-top: 1px solid #edf2f7; padding-top: 5px; margin-left: 15mm; margin-right: 15mm; display: flex; justify-content: space-between;">
                    <div>Unified Transaction Ledger &bull; HR Management System</div>
                    <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
                </div>
            `
        });
        
        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

export default {
    getUnifiedTransactions,
    generatePDFBuffer
};
