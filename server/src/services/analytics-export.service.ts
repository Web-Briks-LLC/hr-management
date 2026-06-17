import { endOfMonth, endOfYear } from 'date-fns';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import '../models/user.model.js';
import '../models/branch.model.js';
import '../models/client.model.js';
import puppeteer from 'puppeteer';
import exceljs from 'exceljs';
import type { AnalyticsQueryParams } from '../types/analytics.type.js';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const formatBDT = (amount: number) => {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

async function getExportData(params: AnalyticsQueryParams) {
    const now = new Date();
    const year = params.year || now.getFullYear();
    const month = params.month; // Optional: 1-12

    let startDate: Date;
    let endDate: Date;
    let periodLabel = `${year}`;

    if (month) {
        startDate = new Date(year, month - 1, 1);
        endDate = endOfMonth(startDate);
        periodLabel = `${MONTH_NAMES[month - 1]}, ${year}`;
    } else {
        startDate = new Date(year, 0, 1);
        endDate = endOfYear(startDate);
        periodLabel = `Year ${year}`;
    }

    // Earnings query
    const earningMatch: any = {
        status: 'paid',
        year: year,
    };
    if (month) {
        earningMatch.month = month;
    }

    const earnings = await EarningModel.find(earningMatch)
        .populate('clientId', 'name')
        .sort({ createdAt: 1 })
        .lean();

    // Expenses query
    const expenseFilter: any = {
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['paid', 'partial_paid'] },
    };

    const expenses = await ExpenseModel.find(expenseFilter)
        .populate('branchId', 'name')
        .sort({ date: 1 })
        .lean();

    // Fetch user details manually since User is a raw collection
    const userIds = [...new Set(expenses.map(e => e.createdBy?.toString()))].filter(Boolean);
    const { default: UserModel } = await import('../models/user.model.js');
    const users = await UserModel.find({ _id: { $in: userIds as any } }).toArray();
    const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

    // Summary calculation
    let totalEarningsBDT = 0;
    let totalExpensesBDT = 0;

    const formattedEarnings = earnings.map((e: any) => {
        const totalBDT = e.paidAmountBDT || e.amountInBDT || 0;
        totalEarningsBDT += totalBDT;
        return {
            clientName: e.clientId?.name || e.legacyClientCode || 'Unknown Client',
            images: e.imageQty || 0,
            price: e.totalAmount || 0,
            currency: e.currency || 'USD',
            convertedPrice: e.conversionRate || 0,
            totalBDT: totalBDT,
        };
    });

    const formattedExpenses = expenses.map((e: any) => {
        totalExpensesBDT += e.amount || 0;
        const createdByName = userMap.get(e.createdBy?.toString()) || 'Unknown User';
        return {
            date: e.date,
            title: e.title,
            branchName: e.branchId?.name || 'Unknown Branch',
            amount: e.amount || 0,
            createdBy: createdByName,
        };
    });

    // Summary net logic for table footers
    const earningsNet = formattedEarnings.reduce(
        (acc, curr) => {
            acc.images += curr.images;
            acc.price += curr.price;
            acc.totalBDT += curr.totalBDT;
            return acc;
        },
        { images: 0, price: 0, totalBDT: 0 }
    );

    const expensesNet = formattedExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return {
        periodLabel,
        summary: {
            totalEarningsBDT,
            totalExpensesBDT,
            netProfitBDT: totalEarningsBDT - totalExpensesBDT
        },
        earnings: formattedEarnings,
        earningsNet,
        expenses: formattedExpenses,
        expensesNet
    };
}

// PDF Generation
async function generatePDF(params: AnalyticsQueryParams): Promise<Buffer> {
    const data = await getExportData(params);

    const earningsRows = data.earnings.map((e, idx) => `
        <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
            <td>${e.clientName}</td>
            <td class="text-right">${e.images}</td>
            <td class="text-right">${formatCurrency(e.price)} ${e.currency}</td>
            <td class="text-right">${formatCurrency(e.convertedPrice)}</td>
            <td class="text-right font-semibold">BDT ${formatBDT(e.totalBDT)}</td>
        </tr>
    `).join('');

    const expensesRows = data.expenses.map((e, idx) => `
        <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
            <td>${formatDate(e.date)}</td>
            <td>${e.title}</td>
            <td>${e.branchName}</td>
            <td class="text-right font-semibold">BDT ${formatBDT(e.amount)}</td>
            <td>${e.createdBy}</td>
        </tr>
    `).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            :root {
                --primary: #0f172a;
                --primary-light: #f8fafc;
                --border: #e2e8f0;
                --text-main: #334155;
                --text-muted: #64748b;
                --green: #16a34a;
                --red: #dc2626;
                --blue: #2563eb;
            }
            body {
                font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 11px;
                color: var(--text-main);
                margin: 0;
                padding: 0;
            }
            .header {
                text-align: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid var(--primary);
            }
            .header h1 {
                font-size: 24px;
                color: var(--primary);
                margin: 0 0 5px 0;
                font-weight: 700;
            }
            .header p {
                margin: 0;
                color: var(--text-muted);
                font-size: 13px;
            }
            .summary-box {
                display: flex;
                justify-content: space-between;
                background: var(--primary-light);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 30px;
            }
            .summary-item {
                text-align: center;
                flex: 1;
            }
            .summary-item:not(:last-child) {
                border-right: 1px solid var(--border);
            }
            .summary-label {
                font-size: 10px;
                text-transform: uppercase;
                color: var(--text-muted);
                letter-spacing: 0.5px;
                margin-bottom: 5px;
            }
            .summary-value {
                font-size: 16px;
                font-weight: 700;
            }
            .value-green { color: var(--green); }
            .value-red { color: var(--red); }
            .value-blue { color: var(--blue); }
            
            .section-title {
                font-size: 16px;
                color: var(--primary);
                margin: 20px 0 10px 0;
                font-weight: 600;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            th, td {
                border: 1px solid var(--border);
                padding: 8px 10px;
                text-align: left;
            }
            th {
                background-color: var(--primary);
                color: white;
                font-weight: 500;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            tr.even { background-color: #fcfcfc; }
            tr.odd { background-color: #ffffff; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-semibold { font-weight: 600; }
            .footer-row td {
                background-color: var(--primary-light);
                font-weight: 700;
                color: var(--primary);
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Finance Analytics Report</h1>
            <p>Period: <strong>${data.periodLabel}</strong></p>
            <p style="font-size: 10px; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-box">
            <div class="summary-item">
                <div class="summary-label">Total Earnings</div>
                <div class="summary-value value-green">BDT ${formatBDT(data.summary.totalEarningsBDT)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Expenses</div>
                <div class="summary-value value-red">BDT ${formatBDT(data.summary.totalExpensesBDT)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Net Profit</div>
                <div class="summary-value value-blue">BDT ${formatBDT(data.summary.netProfitBDT)}</div>
            </div>
        </div>

        <div class="section-title">Earnings Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Client Name</th>
                    <th class="text-right">Total Images</th>
                    <th class="text-right">Total Price</th>
                    <th class="text-right">Converted Price</th>
                    <th class="text-right">Total BDT</th>
                </tr>
            </thead>
            <tbody>
                ${earningsRows || '<tr><td colspan="5" class="text-center">No earnings data for this period.</td></tr>'}
            </tbody>
            <tfoot>
                <tr class="footer-row">
                    <td>NET TOTAL</td>
                    <td class="text-right">${data.earningsNet.images}</td>
                    <td class="text-right">${formatCurrency(data.earningsNet.price)}</td>
                    <td></td>
                    <td class="text-right">BDT ${formatBDT(data.earningsNet.totalBDT)}</td>
                </tr>
            </tfoot>
        </table>

        <div class="section-title">Expenses Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Expense Title</th>
                    <th>Branch Name</th>
                    <th class="text-right">Amount</th>
                    <th>By</th>
                </tr>
            </thead>
            <tbody>
                ${expensesRows || '<tr><td colspan="5" class="text-center">No expense data for this period.</td></tr>'}
            </tbody>
            <tfoot>
                <tr class="footer-row">
                    <td colspan="3" class="text-right">NET TOTAL</td>
                    <td class="text-right">BDT ${formatBDT(data.expensesNet)}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    </body>
    </html>
    `;

    const launchOptions: any = {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    };

    if (process.platform === "linux") {
        launchOptions.executablePath = "/usr/bin/google-chrome";
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });
        
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                bottom: "15mm",
                left: "15mm",
                right: "15mm",
            }
        });
        
        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

// Excel Generation using ExcelJS
async function generateExcel(params: AnalyticsQueryParams): Promise<Buffer> {
    const data = await getExportData(params);
    const workbook = new exceljs.Workbook();

    // -- EARNINGS SHEET --
    const earningsSheet = workbook.addWorksheet('Earnings');
    
    // Title
    earningsSheet.mergeCells('A1:E1');
    const titleCell = earningsSheet.getCell('A1');
    titleCell.value = `Earnings Report - ${data.periodLabel}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Headers
    earningsSheet.getRow(3).values = ['Client Name', 'Total Images', 'Total Price', 'Converted Price', 'Total BDT'];
    earningsSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    earningsSheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Header Style
    for (let i = 1; i <= 5; i++) {
        const cell = earningsSheet.getCell(3, i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    }

    // Data Rows
    let rowNum = 4;
    data.earnings.forEach((e) => {
        const row = earningsSheet.getRow(rowNum);
        row.values = [e.clientName, e.images, `${e.price} ${e.currency}`, e.convertedPrice, e.totalBDT];
        
        for (let i = 1; i <= 5; i++) {
            row.getCell(i).border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        }
        rowNum++;
    });

    // Net Row
    const netRow = earningsSheet.getRow(rowNum);
    netRow.values = ['NET TOTAL', data.earningsNet.images, data.earningsNet.price, '', data.earningsNet.totalBDT];
    netRow.font = { bold: true };
    for (let i = 1; i <= 5; i++) {
        netRow.getCell(i).border = {
            top: { style: 'medium' }, left: { style: 'thin' },
            bottom: { style: 'medium' }, right: { style: 'thin' }
        };
    }

    // Column Widths
    earningsSheet.columns = [
        { width: 30 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 20 }
    ];

    // -- EXPENSES SHEET --
    const expensesSheet = workbook.addWorksheet('Expenses');
    
    expensesSheet.mergeCells('A1:E1');
    const exTitleCell = expensesSheet.getCell('A1');
    exTitleCell.value = `Expenses Report - ${data.periodLabel}`;
    exTitleCell.font = { size: 16, bold: true };
    exTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Headers
    expensesSheet.getRow(3).values = ['Date', 'Expense Title', 'Branch Name', 'Amount', 'By'];
    expensesSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    expensesSheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };
    
    for (let i = 1; i <= 5; i++) {
        const cell = expensesSheet.getCell(3, i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    }

    // Data Rows
    rowNum = 4;
    data.expenses.forEach((e) => {
        const row = expensesSheet.getRow(rowNum);
        row.values = [formatDate(e.date), e.title, e.branchName, e.amount, e.createdBy];
        
        for (let i = 1; i <= 5; i++) {
            row.getCell(i).border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        }
        rowNum++;
    });

    // Net Row
    const exNetRow = expensesSheet.getRow(rowNum);
    exNetRow.values = ['', '', 'NET TOTAL', data.expensesNet, ''];
    exNetRow.font = { bold: true };
    for (let i = 1; i <= 5; i++) {
        exNetRow.getCell(i).border = {
            top: { style: 'medium' }, left: { style: 'thin' },
            bottom: { style: 'medium' }, right: { style: 'thin' }
        };
    }

    expensesSheet.columns = [
        { width: 20 }, { width: 35 }, { width: 25 }, { width: 15 }, { width: 25 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

export default {
    generatePDF,
    generateExcel
};
