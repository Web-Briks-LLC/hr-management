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
                        $or: [
                            { paidAt: { $lt: start } },
                            { paidAt: null, createdAt: { $lt: start } },
                            { paidAt: { $exists: false }, createdAt: { $lt: start } }
                        ]
                    }
                },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$paidAmountBDT", "$amountInBDT"] } } } }
            ]),
            DebitModel.aggregate([
                {
                    $match: {
                        type: DebitType.BORROW,
                        $or: [
                            { date: { $lt: start } },
                            { date: null, createdAt: { $lt: start } },
                            { date: { $exists: false }, createdAt: { $lt: start } }
                        ]
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Outflows before 'start'
            DebitModel.aggregate([
                {
                    $match: {
                        type: DebitType.RETURN,
                        $or: [
                            { date: { $lt: start } },
                            { date: null, createdAt: { $lt: start } },
                            { date: { $exists: false }, createdAt: { $lt: start } }
                        ]
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            ExpenseModel.aggregate([
                {
                    $match: {
                        status: { $in: ["paid", "partial_paid"] },
                        $or: [
                            { date: { $lt: start } },
                            { date: null, createdAt: { $lt: start } },
                            { date: { $exists: false }, createdAt: { $lt: start } }
                        ]
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            ProfitTransferModel.aggregate([
                {
                    $match: {
                        $or: [
                            { transferDate: { $lt: start } },
                            { transferDate: null, createdAt: { $lt: start } },
                            { transferDate: { $exists: false }, createdAt: { $lt: start } }
                        ]
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            ProfitDistributionModel.aggregate([
                {
                    $match: {
                        status: "distributed",
                        $or: [
                            { distributedAt: { $lt: start } },
                            { distributedAt: null, createdAt: { $lt: start } },
                            { distributedAt: { $exists: false }, createdAt: { $lt: start } }
                        ]
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
        earningRangeFilter.$or = [
            { paidAt: { $gte: start, $lte: end } },
            { paidAt: null, createdAt: { $gte: start, $lte: end } },
            { paidAt: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
        expenseRangeFilter.$or = [
            { date: { $gte: start, $lte: end } },
            { date: null, createdAt: { $gte: start, $lte: end } },
            { date: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
        debitRangeFilter.$or = [
            { date: { $gte: start, $lte: end } },
            { date: null, createdAt: { $gte: start, $lte: end } },
            { date: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
        distributionRangeFilter.$or = [
            { distributedAt: { $gte: start, $lte: end } },
            { distributedAt: null, createdAt: { $gte: start, $lte: end } },
            { distributedAt: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
        transferRangeFilter.$or = [
            { transferDate: { $gte: start, $lte: end } },
            { transferDate: null, createdAt: { $gte: start, $lte: end } },
            { transferDate: { $exists: false }, createdAt: { $gte: start, $lte: end } }
        ];
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
            date: e.paidAt || e.createdAt || new Date(),
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
            date: ex.date || (ex as any).createdAt || new Date(),
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
            date: d.date || (d as any).createdAt || new Date(),
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
            date: d.distributedAt || (d as any).createdAt || new Date(),
            title: `Profit Payout to ${(d.shareholderId as any)?.name || "Shareholder"}`,
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
            date: t.transferDate || (t as any).createdAt || new Date(),
            title: `Profit Transfer to ${(t.businessId as any)?.name || "External Business"}`,
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

    const tableRows = transactions.map((t, idx) => {
        const isEven = idx % 2 === 0;
        const typeLabel = t.type.toUpperCase().replace("_", " ");
        const flowSign = t.flow === "inflow" ? "+" : "-";
        const flowClass = t.flow === "inflow" ? "inflow" : "outflow";
        
        return `
            <tr class="${isEven ? 'even' : 'odd'}">
                <td>${dateFormatted(t.date)}</td>
                <td>
                    <div style="font-weight: 600; color: #2d3748;">${t.title}</div>
                    ${t.note ? `<div style="font-size: 11px; color: #718096; margin-top: 2px;">${t.note}</div>` : ""}
                </td>
                <td><span class="badge badge-${t.type}">${typeLabel}</span></td>
                <td class="${flowClass} text-right">${flowSign} BDT ${formatBDT(t.amountInBDT)}</td>
                <td class="text-right" style="font-weight: 600; color: #1a202c;">BDT ${formatBDT(t.runningBalance || 0)}</td>
            </tr>
        `;
    }).join("");

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 13px;
                color: #2d3748;
                line-height: 1.5;
                padding: 0;
                margin: 0;
            }
            .header-container {
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .title-block h1 {
                font-size: 22px;
                font-weight: 700;
                color: #1a365d;
                margin: 0 0 5px 0;
            }
            .meta-info {
                color: #718096;
                font-size: 12px;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
                margin-bottom: 25px;
            }
            .summary-card {
                background: #f7fafc;
                border: 1px solid #edf2f7;
                border-radius: 6px;
                padding: 10px;
                text-align: center;
            }
            .summary-card.accent {
                background: #ebf8ff;
                border-color: #bee3f8;
            }
            .summary-card .label {
                font-size: 10px;
                text-transform: uppercase;
                color: #718096;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .summary-card .value {
                font-size: 13px;
                font-weight: 700;
                color: #2d3748;
            }
            .summary-card .value.green {
                color: #2f855a;
            }
            .summary-card .value.red {
                color: #9b2c2c;
            }
            .summary-card .value.blue {
                color: #2b6cb0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            th {
                background-color: #1a365d;
                color: #ffffff;
                font-weight: 600;
                text-align: left;
                padding: 8px 10px;
                font-size: 11px;
                text-transform: uppercase;
            }
            td {
                padding: 10px;
                border-bottom: 1px solid #edf2f7;
                vertical-align: top;
            }
            tr.even {
                background-color: #fcfdfd;
            }
            tr.odd {
                background-color: #ffffff;
            }
            .text-right {
                text-align: right;
            }
            .inflow {
                color: #2f855a;
                font-weight: 600;
            }
            .outflow {
                color: #9b2c2c;
                font-weight: 600;
            }
            .badge {
                display: inline-block;
                padding: 2px 6px;
                font-size: 9px;
                font-weight: 700;
                border-radius: 4px;
                text-transform: uppercase;
            }
            .badge-earning { background: #c6f6d5; color: #22543d; }
            .badge-expense { background: #fed7d7; color: #742a2a; }
            .badge-debit { background: #feebc8; color: #7b341e; }
            .badge-wallet { background: #e2e8f0; color: #4a5568; }
            .badge-profit_share { background: #e9d8fd; color: #44337a; }
            .badge-profit_transfer { background: #ebf8ff; color: #2b6cb0; }
        </style>
        <title>Unified Financial Ledger Report</title>
    </head>
    <body>
        <div class="header-container">
            <div class="title-block">
                <h1>Unified Financial Ledger Report</h1>
                <div class="meta-info">
                    <span>Period: <strong>${startDate}</strong> to <strong>${endDate}</strong></span>
                    <span style="margin-left: 20px;">Generated: <strong>${new Date().toLocaleString()}</strong></span>
                </div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">Opening Balance</div>
                <div class="value">BDT ${formatBDT(summary.openingBalance)}</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Inflow</div>
                <div class="value green">+ BDT ${formatBDT(summary.totalInflow)}</div>
            </div>
            <div class="summary-card">
                <div class="label">Total Outflow</div>
                <div class="value red">- BDT ${formatBDT(summary.totalOutflow)}</div>
            </div>
            <div class="summary-card">
                <div class="label">Net Change</div>
                <div class="value ${summary.netChange >= 0 ? 'green' : 'red'}">
                    ${summary.netChange >= 0 ? '+' : ''} BDT ${formatBDT(summary.netChange)}
                </div>
            </div>
            <div class="summary-card accent">
                <div class="label" style="color: #2b6cb0;">Closing Balance</div>
                <div class="value blue">BDT ${formatBDT(summary.closingBalance)}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">Date</th>
                    <th style="width: 45%;">Description</th>
                    <th style="width: 15%;">Type</th>
                    <th style="width: 13%; text-align: right;">Amount (BDT)</th>
                    <th style="width: 12%; text-align: right;">Balance</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
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
