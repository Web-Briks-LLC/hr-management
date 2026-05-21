import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { Types } from "mongoose";
import puppeteer from "puppeteer";
import EarningModel from "../models/earning.model.js";
import ExpenseModel from "../models/expense.model.js";
import DebitModel, { DebitType } from "../models/Debit.js";
import ProfitTransferModel from "../models/profit-transfer.model.js";
import ProfitDistributionModel from "../models/profit-distribution.model.js";
import WalletTransactionModel from "../models/wallet-transaction.model.js";
import type {
    INormalizedTransaction,
    TransactionQueryParams,
    ITransactionReportData,
} from "../types/transaction.type.js";
import { escapeRegex } from "../lib/sanitize.js";

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
    const start = params.startDate ? startOfDay(new Date(params.startDate)) : startOfMonth(now);
    const end = params.endDate ? endOfDay(new Date(params.endDate)) : endOfDay(now);

    // 2. Parse active transaction types to include
    const activeTypes = params.type 
        ? params.type.split(",").map(t => t.trim().toLowerCase()) 
        : ["earning", "expense", "debit", "wallet", "profit_share", "profit_transfer"];

    // 3. STEP 1: CALCULATE CUMULATIVE OPENING BALANCE (everything strictly before 'start')
    const [
        earningsBefore,
        debitBorrowsBefore,
        debitReturnsBefore,
        expensesBefore,
        transfersBefore,
        distributionsBefore,
        walletWithdrawalsBefore
    ] = await Promise.all([
        // Inflows before 'start'
        EarningModel.aggregate([
            { $match: { status: "paid", paidAt: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$amountInBDT" } } }
        ]),
        DebitModel.aggregate([
            { $match: { type: DebitType.BORROW, date: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        // Outflows before 'start'
        DebitModel.aggregate([
            { $match: { type: DebitType.RETURN, date: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        ExpenseModel.aggregate([
            { $match: { status: { $in: ["paid", "partial_paid"] }, date: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        ProfitTransferModel.aggregate([
            { $match: { transferDate: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        ProfitDistributionModel.aggregate([
            { $match: { status: "distributed", distributedAt: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$shareAmount" } } }
        ]),
        WalletTransactionModel.aggregate([
            { $match: { type: "withdrawal", status: "completed", createdAt: { $lt: start } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
    ]);

    const sumEarningsBefore = earningsBefore[0]?.total || 0;
    const sumDebitBorrowsBefore = debitBorrowsBefore[0]?.total || 0;
    const sumDebitReturnsBefore = debitReturnsBefore[0]?.total || 0;
    const sumExpensesBefore = expensesBefore[0]?.total || 0;
    const sumTransfersBefore = transfersBefore[0]?.total || 0;
    const sumDistributionsBefore = distributionsBefore[0]?.total || 0;
    const sumWalletWithdrawalsBefore = walletWithdrawalsBefore[0]?.total || 0;

    const openingBalance = (sumEarningsBefore + sumDebitBorrowsBefore) - 
                           (sumExpensesBefore + sumTransfersBefore + sumDistributionsBefore + sumDebitReturnsBefore + sumWalletWithdrawalsBefore);

    // 4. STEP 2: FETCH RANGE DATA (filtering by date range, branch, search query, type)
    const queries: Promise<INormalizedTransaction[]>[] = [];
    const searchRegex = params.search ? { $regex: escapeRegex(params.search), $options: "i" } : null;

    // Filter helpers
    const branchFilter = (modelField: string) => {
        if (params.branchId && Types.ObjectId.isValid(params.branchId)) {
            return { [modelField]: new Types.ObjectId(params.branchId) };
        }
        return {};
    };

    // A. Earnings (Inflow)
    if (activeTypes.includes("earning")) {
        const match: any = { status: "paid", paidAt: { $gte: start, $lte: end } };
        if (searchRegex) {
            match.notes = searchRegex;
        }
        
        queries.push(
            EarningModel.find(match)
                .populate("clientId")
                .lean()
                .then(records => records.map(e => ({
                    id: e._id.toString(),
                    date: e.paidAt || e.createdAt,
                    title: `Revenue Earning: ${(e.clientId as any)?.name || e.legacyClientCode || "Client"}`,
                    type: "earning",
                    amount: e.totalAmount,
                    currency: e.currency,
                    amountInBDT: e.amountInBDT,
                    flow: "inflow",
                    status: "paid",
                    referenceId: (e.clientId as any)?._id || e.clientId,
                    note: e.notes
                } as INormalizedTransaction)))
        );
    }

    // B. Expenses (Outflow)
    if (activeTypes.includes("expense")) {
        const match: any = { 
            status: { $in: ["paid", "partial_paid"] }, 
            date: { $gte: start, $lte: end },
            ...branchFilter("branchId")
        };
        if (searchRegex) {
            match.$or = [
                { title: searchRegex },
                { note: searchRegex }
            ];
        }

        queries.push(
            ExpenseModel.find(match)
                .populate("categoryId createdBy")
                .lean()
                .then(records => records.map(ex => ({
                    id: ex._id.toString(),
                    date: ex.date,
                    title: `Expense: ${ex.title} (${(ex.categoryId as any)?.name || "Uncategorized"})`,
                    type: "expense",
                    amount: ex.amount,
                    currency: "BDT",
                    amountInBDT: ex.amount,
                    flow: "outflow",
                    status: ex.status as any,
                    referenceId: ex.branchId,
                    note: ex.note,
                    createdBy: ex.createdBy ? {
                        _id: (ex.createdBy as any)._id,
                        name: (ex.createdBy as any).name || (ex.createdBy as any).username || "User"
                    } : undefined
                } as INormalizedTransaction)))
        );
    }

    // C. Debits (Inflow/Outflow)
    if (activeTypes.includes("debit")) {
        const match: any = { date: { $gte: start, $lte: end } };
        if (searchRegex) {
            match.description = searchRegex;
        }

        queries.push(
            DebitModel.find(match)
                .populate("personId createdBy")
                .lean()
                .then(records => records.map(d => ({
                    id: d._id.toString(),
                    date: d.date,
                    title: `Debit ${d.type}: ${(d.personId as any)?.name || "Unknown Person"}`,
                    type: "debit",
                    subType: d.type,
                    amount: d.amount,
                    currency: "BDT",
                    amountInBDT: d.amount,
                    flow: d.type === DebitType.BORROW ? "inflow" : "outflow",
                    status: "completed" as any,
                    referenceId: (d.personId as any)?._id || d.personId,
                    note: d.description
                } as INormalizedTransaction)))
        );
    }

    // D. Wallet Withdrawals (Outflow)
    if (activeTypes.includes("wallet")) {
        const match: any = { 
            type: "withdrawal", 
            status: "completed", 
            createdAt: { $gte: start, $lte: end } 
        };
        if (searchRegex) {
            match.description = searchRegex;
        }

        queries.push(
            WalletTransactionModel.find(match)
                .populate("staffId createdBy")
                .lean()
                .then(records => records.map(w => ({
                    id: w._id.toString(),
                    date: w.createdAt,
                    title: `Staff Wallet Withdrawal: ${(w.staffId as any)?.name || "Staff"}`,
                    type: "wallet",
                    subType: w.type,
                    amount: w.amount,
                    currency: "BDT",
                    amountInBDT: w.amount,
                    flow: "outflow",
                    status: "completed",
                    referenceId: (w.staffId as any)?._id || w.staffId,
                    note: w.description
                } as INormalizedTransaction)))
        );
    }

    // E. Profit Distributions (Outflow)
    if (activeTypes.includes("profit_share")) {
        const match: any = { 
            status: "distributed", 
            distributedAt: { $gte: start, $lte: end } 
        };
        if (searchRegex) {
            match.notes = searchRegex;
        }

        queries.push(
            ProfitDistributionModel.find(match)
                .populate("shareholderId distributedBy")
                .lean()
                .then(records => records.map(d => ({
                    id: d._id.toString(),
                    date: d.distributedAt,
                    title: `Profit Payout to ${(d.shareholderId as any)?.name || "Shareholder"}`,
                    type: "profit_share",
                    amount: d.shareAmount,
                    currency: "BDT",
                    amountInBDT: d.shareAmount,
                    flow: "outflow",
                    status: "distributed",
                    referenceId: (d.shareholderId as any)?._id || d.shareholderId,
                    note: d.notes
                } as INormalizedTransaction)))
        );
    }

    // F. Profit Transfers (Outflow)
    if (activeTypes.includes("profit_transfer")) {
        const match: any = { transferDate: { $gte: start, $lte: end } };
        if (searchRegex) {
            match.notes = searchRegex;
        }

        queries.push(
            ProfitTransferModel.find(match)
                .populate("businessId transferredBy")
                .lean()
                .then(records => records.map(t => ({
                    id: t._id.toString(),
                    date: t.transferDate,
                    title: `Profit Transfer to ${(t.businessId as any)?.name || "External Business"}`,
                    type: "profit_transfer",
                    amount: t.amount,
                    currency: "BDT",
                    amountInBDT: t.amount,
                    flow: "outflow",
                    status: "completed" as any,
                    referenceId: (t.businessId as any)?._id || t.businessId,
                    note: t.notes
                } as INormalizedTransaction)))
        );
    }

    // Resolve all fetch queries concurrently
    const queryResults = await Promise.all(queries);
    const rawTransactions = queryResults.flat();

    // 5. STEP 3: SORT CHRONOLOGICALLY (ASCENDING) TO COMPUTE RUNNING BALANCE CORRECTLY
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingBalance;
    let totalInflow = 0;
    let totalOutflow = 0;

    const processedTransactions = rawTransactions.map(tx => {
        if (tx.flow === "inflow") {
            running += tx.amountInBDT;
            totalInflow += tx.amountInBDT;
        } else {
            running -= tx.amountInBDT;
            totalOutflow += tx.amountInBDT;
        }
        tx.runningBalance = running;
        return tx;
    });

    const closingBalance = running;
    const netChange = totalInflow - totalOutflow;

    // 6. STEP 4: PRESENTATION SORT (DESCENDING)
    processedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        summary: {
            openingBalance,
            totalInflow,
            totalOutflow,
            netChange,
            closingBalance,
        },
        transactions: processedTransactions,
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
    
    // Launch headless Chromium via Puppeteer
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

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
