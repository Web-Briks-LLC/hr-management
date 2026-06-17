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

    const earningsRows = data.earnings.map((e) => `
        <tr>
            <td>${e.clientName}</td>
            <td class="text-right font-mono">${e.images}</td>
            <td class="text-right font-mono">${formatCurrency(e.price)} ${e.currency}</td>
            <td class="text-right font-mono">${formatCurrency(e.convertedPrice)}</td>
            <td class="text-right font-mono">${formatBDT(e.totalBDT)}</td>
        </tr>
    `).join('');

    const expensesRows = data.expenses.map((e) => `
        <tr>
            <td>${formatDate(e.date)}</td>
            <td>${e.title}</td>
            <td>${e.branchName}</td>
            <td class="text-right font-mono">${formatBDT(e.amount)}</td>
            <td>${e.createdBy}</td>
        </tr>
    `).join('');

    const netProfit = data.summary.netProfitBDT;
    const isNegativeProfit = netProfit < 0;
    const netProfitValue = isNegativeProfit 
        ? `(BDT ${formatBDT(Math.abs(netProfit))})`
        : `BDT ${formatBDT(netProfit)}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Finance Report - ${data.periodLabel}</title>
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
                color: #1E0078; /* Positive net profit gets accent */
                font-weight: 700;
            }
            
            .summary-table tr.total-row td.value.negative {
                color: #111827; /* Negative net profit (loss) in parentheses, black */
            }

            /* ── Sections & Tables ─────────────── */

            .section {
                margin-bottom: 40px;
                page-break-inside: auto;
            }
            
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

            table.data-table tfoot tr {
                font-weight: 600;
                background: #FFFFFF;
            }
            
            table.data-table tfoot td {
                border: 1px solid #E5E7EB;
                padding: 12px;
                font-weight: 600;
                color: #111827;
            }

            .total-value {
                color: #111827;
            }

            .accent-value {
                color: #1E0078;
                font-weight: 700;
            }

            /* ── Empty State ─────────────────── */

            .empty-row td {
                padding: 40px 12px;
                text-align: center;
                color: #6B7280;
                font-style: italic;
            }

            /* ── Utilities ───────────────────── */

            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .font-mono {
                font-variant-numeric: tabular-nums;
            }

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
                .section { page-break-inside: auto; }
                table.data-table { page-break-inside: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                tr { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>

        <!-- Header -->
        <header class="report-header">
            <div class="header-left">
                <span class="brand">HR Management</span>
                <h1>Finance Analytics Report</h1>
            </div>
            <div class="header-right">
                <div>Period: <strong>${data.periodLabel}</strong></div>
                <div>Generated: <strong>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
            </div>
        </header>

        <!-- Financial Summary (Statement Style) -->
        <section class="summary-container">
            <h3 class="summary-title">Financial Summary</h3>
            <table class="summary-table">
                <tbody>
                    <tr>
                        <td class="label">Gross Revenue</td>
                        <td class="value font-mono">BDT ${formatBDT(data.summary.totalEarningsBDT)}</td>
                    </tr>
                    <tr>
                        <td class="label">Operating Expenses</td>
                        <td class="value font-mono">(BDT ${formatBDT(data.summary.totalExpensesBDT)})</td>
                    </tr>
                    <tr class="total-row">
                        <td class="label">Net Profit</td>
                        <td class="value font-mono ${isNegativeProfit ? 'negative' : ''}">${netProfitValue}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        <!-- Earnings Section -->
        <div class="section">
            <h2 class="section-title">Earnings Breakdown</h2>
            <table class="data-table">
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
                    ${earningsRows || `<tr class="empty-row"><td colspan="5">No earnings available for this reporting period.</td></tr>`}
                </tbody>
                ${earningsRows ? `
                <tfoot>
                    <tr>
                        <td>Total</td>
                        <td class="text-right font-mono">${data.earningsNet.images}</td>
                        <td class="text-right font-mono">${formatCurrency(data.earningsNet.price)}</td>
                        <td></td>
                        <td class="text-right accent-value font-mono">BDT ${formatBDT(data.earningsNet.totalBDT)}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>

        <!-- Expenses Section -->
        <div class="section">
            <h2 class="section-title">Expenses Breakdown</h2>
            <table class="data-table">
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
                    ${expensesRows || `<tr class="empty-row"><td colspan="5">No expenses available for this reporting period.</td></tr>`}
                </tbody>
                ${expensesRows ? `
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-right">Total</td>
                        <td class="text-right total-value font-mono">BDT ${formatBDT(data.expensesNet)}</td>
                        <td></td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>

        <!-- Footer -->
        <footer class="report-footer">
            <span>This report was auto-generated. All amounts are in Bangladeshi Taka (BDT).</span>
            <span class="footer-brand">HR MANAGEMENT</span>
        </footer>

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

    const headerFill: exceljs.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' } // Light gray background
    };

    const headerFont: Partial<exceljs.Font> = {
        bold: true,
        size: 11,
        color: { argb: 'FF111827' }, // Dark text
        name: 'Arial'
    };

    const titleFont: Partial<exceljs.Font> = {
        bold: true,
        size: 14,
        color: { argb: 'FF111827' },
        name: 'Arial'
    };

    const dataFont: Partial<exceljs.Font> = {
        size: 10,
        color: { argb: 'FF111827' },
        name: 'Arial'
    };

    const borderStyle: Partial<exceljs.Borders> = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };

    const doubleBottomBorder: Partial<exceljs.Borders> = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'double', color: { argb: 'FF111827' } }, // Classic accounting double border
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };

    // -- EARNINGS SHEET --
    const earningsSheet = workbook.addWorksheet('Earnings');
    
    // Title
    earningsSheet.mergeCells('A1:E1');
    const titleCell = earningsSheet.getCell('A1');
    titleCell.value = `Earnings Report - ${data.periodLabel}`;
    titleCell.font = titleFont;
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Headers
    earningsSheet.getRow(3).values = ['Client Name', 'Total Images', 'Total Price', 'Converted Price', 'Total BDT'];
    earningsSheet.getRow(3).font = headerFont;
    earningsSheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'left' };
    
    // Header Style
    for (let i = 1; i <= 5; i++) {
        const cell = earningsSheet.getCell(3, i);
        cell.fill = headerFill;
        cell.border = borderStyle;
    }

    // Data Rows
    let rowNum = 4;
    data.earnings.forEach((e) => {
        const row = earningsSheet.getRow(rowNum);
        row.values = [e.clientName, e.images, `${e.price} ${e.currency}`, e.convertedPrice, e.totalBDT];
        row.font = dataFont;
        
        for (let i = 1; i <= 5; i++) {
            row.getCell(i).border = borderStyle;
        }
        rowNum++;
    });

    // Net Row
    const netRow = earningsSheet.getRow(rowNum);
    netRow.values = ['NET TOTAL', data.earningsNet.images, data.earningsNet.price, '', data.earningsNet.totalBDT];
    netRow.font = { bold: true, size: 10, color: { argb: 'FF111827' }, name: 'Arial' };
    for (let i = 1; i <= 5; i++) {
        netRow.getCell(i).border = doubleBottomBorder;
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
    exTitleCell.font = titleFont;
    exTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Headers
    expensesSheet.getRow(3).values = ['Date', 'Expense Title', 'Branch Name', 'Amount', 'By'];
    expensesSheet.getRow(3).font = headerFont;
    expensesSheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'left' };
    
    for (let i = 1; i <= 5; i++) {
        const cell = expensesSheet.getCell(3, i);
        cell.fill = headerFill;
        cell.border = borderStyle;
    }

    // Data Rows
    rowNum = 4;
    data.expenses.forEach((e) => {
        const row = expensesSheet.getRow(rowNum);
        row.values = [formatDate(e.date), e.title, e.branchName, e.amount, e.createdBy];
        row.font = dataFont;
        
        for (let i = 1; i <= 5; i++) {
            row.getCell(i).border = borderStyle;
        }
        rowNum++;
    });

    // Net Row
    const exNetRow = expensesSheet.getRow(rowNum);
    exNetRow.values = ['', '', 'NET TOTAL', data.expensesNet, ''];
    exNetRow.font = { bold: true, size: 10, color: { argb: 'FF111827' }, name: 'Arial' };
    for (let i = 1; i <= 5; i++) {
        exNetRow.getCell(i).border = doubleBottomBorder;
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
