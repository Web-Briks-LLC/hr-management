import { getBDStartOfDay, getBDEndOfDay } from '../utils/date.util.js';
import EarningModel from '../models/earning.model.js';
import ExpenseModel from '../models/expense.model.js';
import DebitModel from '../models/Debit.js';
import '../models/Person.js';
import '../models/user.model.js';
import '../models/branch.model.js';
import '../models/client.model.js';
import '../models/expense-category.model.js';
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

const getBDYearMonth = (date: Date): string => {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    return `${year}-${month}`; // e.g. "2026-06"
};

const getBDMonthLabel = (date: Date): string => {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'long',
    }).formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    return `${month} ${year}`; // e.g. "June 2026"
};

const getMonthsInInterval = (start: Date, end: Date) => {
    const monthsList: { key: string; label: string; year: number; month: number; date: Date }[] = [];
    let current = new Date(start.getTime());
    const endKey = getBDYearMonth(end);
    
    while (true) {
        const key = getBDYearMonth(current);
        const label = getBDMonthLabel(current);
        
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dhaka',
            year: 'numeric',
            month: 'numeric',
        }).formatToParts(current);
        
        const year = Number(parts.find(p => p.type === 'year')?.value);
        const month = Number(parts.find(p => p.type === 'month')?.value);
        
        if (!monthsList.some(m => m.key === key)) {
            monthsList.push({ key, label, year, month, date: new Date(current.getTime()) });
        }
        
        if (key === endKey) {
            break;
        }
        
        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }
        current = new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T12:00:00+06:00`);
    }
    return monthsList;
};

async function getExportData(params: AnalyticsQueryParams) {
    const now = new Date();
    const hasDateRange = !!(params.startDate && params.endDate);
    
    let startDate: Date;
    let endDate: Date;
    let periodLabel = '';

    if (hasDateRange) {
        const startStr = params.startDate!.includes("T") ? params.startDate! : `${params.startDate!}T00:00:00`;
        const endStr = params.endDate!.includes("T") ? params.endDate! : `${params.endDate!}T23:59:59.999`;
        startDate = getBDStartOfDay(new Date(startStr));
        endDate = getBDEndOfDay(new Date(endStr));
        const startLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric' }).format(startDate);
        const endLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric' }).format(endDate);
        periodLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
    } else {
        const year = params.year || now.getFullYear();
        const month = params.month; // Optional: 1-12
        if (month) {
            startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01T00:00:00+06:00`);
            const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
            endDate = new Date(`${year}-${month.toString().padStart(2, '0')}-${lastDay}T23:59:59.999+06:00`);
            periodLabel = `${MONTH_NAMES[month - 1]}, ${year}`;
        } else {
            startDate = new Date(`${year}-01-01T00:00:00+06:00`);
            endDate = new Date(`${year}-12-31T23:59:59.999+06:00`);
            periodLabel = `Year ${year}`;
        }
    }

    const monthsInInterval = getMonthsInInterval(startDate, endDate);

    // Earnings query
    const earningMatch: any = {
        status: 'paid',
    };
    if (hasDateRange) {
        earningMatch.$or = monthsInInterval.map(m => ({
            year: m.year,
            month: m.month
        }));
    } else {
        earningMatch.year = params.year || now.getFullYear();
        if (params.month) {
            earningMatch.month = params.month;
        }
    }

    const earnings = await EarningModel.find(earningMatch)
        .populate('clientId', 'name')
        .sort({ createdAt: 1 })
        .lean();

    // Expenses query
    const expenseFilter: any = {
        status: { $in: ['paid', 'partial_paid'] },
        $or: [
            {
                $or: monthsInInterval.map(m => ({
                    billingYear: m.year,
                    billingMonth: m.month
                }))
            },
            {
                billingMonth: { $exists: false },
                date: { $gte: startDate, $lte: endDate }
            },
            {
                billingMonth: null,
                date: { $gte: startDate, $lte: endDate }
            }
        ]
    };

    // Expenses query with $lookup join for user (better-auth collection), branch and category
    const expenses = await ExpenseModel.aggregate([
        { $match: expenseFilter },
        {
            $lookup: {
                from: 'user',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'creatorDetails'
            }
        },
        {
            $unwind: {
                path: '$creatorDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'branches',
                localField: 'branchId',
                foreignField: '_id',
                as: 'branchDetails'
            }
        },
        {
            $unwind: {
                path: '$branchDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'expensecategories',
                localField: 'categoryId',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: {
                path: '$categoryDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        { $sort: { date: 1 } }
    ]);

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
            date: new Date(`${e.year}-${e.month.toString().padStart(2, '0')}-01T12:00:00+06:00`),
        };
    });

    const formattedExpenses = expenses.map((e: any) => {
        totalExpensesBDT += e.amount || 0;
        const createdByName = e.creatorDetails?.name || 'Unknown User';
        const representedDate = e.billingMonth && e.billingYear
            ? new Date(`${e.billingYear}-${e.billingMonth.toString().padStart(2, '0')}-01T12:00:00+06:00`)
            : e.date;
        return {
            date: representedDate,
            title: e.title,
            branchName: e.branchDetails?.name || 'Unknown Branch',
            categoryName: e.categoryDetails?.name || 'Uncategorized',
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

    // Debits query
    const debitFilter = {
        date: { $gte: startDate, $lte: endDate }
    };
    const debits = await DebitModel.aggregate([
        { $match: debitFilter },
        {
            $lookup: {
                from: 'people',
                localField: 'personId',
                foreignField: '_id',
                as: 'personDetails'
            }
        },
        {
            $unwind: {
                path: '$personDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'user',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'creatorDetails'
            }
        },
        {
            $unwind: {
                path: '$creatorDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        { $sort: { date: 1 } }
    ]);

    const formattedDebits = debits.map((d: any) => {
        const amount = d.amount || 0;
        return {
            date: d.date,
            personName: d.personDetails?.name || 'Unknown Person',
            amount: amount,
            type: d.type || 'Borrow',
            description: d.description || '',
            createdBy: d.creatorDetails?.name || 'Unknown User'
        };
    });

    let totalBorrowBDT = 0;
    let totalReturnBDT = 0;
    formattedDebits.forEach((d: any) => {
        if (d.type === 'Borrow') {
            totalBorrowBDT += d.amount;
        } else if (d.type === 'Return') {
            totalReturnBDT += d.amount;
        }
    });

    return {
        startDate,
        endDate,
        periodLabel,
        summary: {
            totalEarningsBDT,
            totalExpensesBDT,
            netProfitBDT: totalEarningsBDT - totalExpensesBDT,
            totalBorrowBDT,
            totalReturnBDT,
            netDebitBDT: totalBorrowBDT - totalReturnBDT
        },
        earnings: formattedEarnings,
        earningsNet,
        expenses: formattedExpenses,
        expensesNet,
        debits: formattedDebits
    };
}

// PDF Generation
async function generatePDF(params: AnalyticsQueryParams): Promise<Buffer> {
    const data = await getExportData(params);

    const months = getMonthsInInterval(data.startDate, data.endDate);

    const monthlySummaries = months.map(m => {
        const monthEarnings = data.earnings.filter((e: any) => getBDYearMonth(new Date(e.date)) === m.key);
        const monthExpenses = data.expenses.filter((e: any) => getBDYearMonth(new Date(e.date)) === m.key);
        const monthDebits = data.debits.filter((d: any) => getBDYearMonth(new Date(d.date)) === m.key);
        
        const earningsBDT = monthEarnings.reduce((acc: number, curr: any) => acc + curr.totalBDT, 0);
        const expensesBDT = monthExpenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const profitBDT = earningsBDT - expensesBDT;
        
        const monthBorrowBDT = monthDebits.reduce((acc: number, curr: any) => curr.type === 'Borrow' ? acc + curr.amount : acc, 0);
        const monthReturnBDT = monthDebits.reduce((acc: number, curr: any) => curr.type === 'Return' ? acc + curr.amount : acc, 0);

        // Group expenses for this month by branchName and categoryName
        const groupedExpenses: Record<string, Record<string, number>> = {};
        for (const exp of monthExpenses) {
            const branch = exp.branchName || 'Unknown Branch';
            const category = exp.categoryName || 'Uncategorized';
            if (!groupedExpenses[branch]) {
                groupedExpenses[branch] = {};
            }
            groupedExpenses[branch][category] = (groupedExpenses[branch][category] || 0) + exp.amount;
        }

        const earningsNet = monthEarnings.reduce(
            (acc: any, curr: any) => {
                acc.images += curr.images;
                acc.price += curr.price;
                acc.totalBDT += curr.totalBDT;
                return acc;
            },
            { images: 0, price: 0, totalBDT: 0 }
        );

        return {
            key: m.key,
            label: m.label,
            earningsBDT,
            expensesBDT,
            profitBDT,
            monthBorrowBDT,
            monthReturnBDT,
            earnings: monthEarnings,
            earningsNet,
            expenses: monthExpenses,
            groupedExpenses,
            debits: monthDebits
        };
    });

    // Generate Earnings HTML
    let earningsHtml = '';
    if (months.length <= 1) {
        const earningsRows = data.earnings.map((e) => `
            <tr>
                <td>${e.clientName}</td>
                <td class="text-right font-mono">${e.images}</td>
                <td class="text-right font-mono">${formatCurrency(e.price)} ${e.currency}</td>
                <td class="text-right font-mono">${formatCurrency(e.convertedPrice)}</td>
                <td class="text-right font-mono">${formatBDT(e.totalBDT)}</td>
            </tr>
        `).join('');
        
        earningsHtml = `
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
        `;
    } else {
        earningsHtml = monthlySummaries.map((m) => {
            const earningsRows = m.earnings.map((e) => `
                <tr>
                    <td>${e.clientName}</td>
                    <td class="text-right font-mono">${e.images}</td>
                    <td class="text-right font-mono">${formatCurrency(e.price)} ${e.currency}</td>
                    <td class="text-right font-mono">${formatCurrency(e.convertedPrice)}</td>
                    <td class="text-right font-mono">${formatBDT(e.totalBDT)}</td>
                </tr>
            `).join('');

            return `
                <div class="month-earnings-block" style="margin-bottom: 32px; page-break-inside: avoid;">
                    <h3 class="subsection-title" style="font-size: 13px; font-weight: 600; color: #1E0078; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 12px; margin-top: 8px;">${m.label} Earnings</h3>
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
                            ${earningsRows || `<tr class="empty-row"><td colspan="5">No earnings available for this month.</td></tr>`}
                        </tbody>
                        ${earningsRows ? `
                        <tfoot>
                            <tr>
                                <td>Total for ${m.label}</td>
                                <td class="text-right font-mono">${m.earningsNet.images}</td>
                                <td class="text-right font-mono">${formatCurrency(m.earningsNet.price)}</td>
                                <td></td>
                                <td class="text-right accent-value font-mono">BDT ${formatBDT(m.earningsBDT)}</td>
                            </tr>
                        </tfoot>` : ''}
                    </table>
                </div>
            `;
        }).join('');
    }

    // Generate Expenses HTML
    let expensesHtml = '';
    if (months.length <= 1) {
        // Group expenses by branchName, and then by categoryName
        const groupedExpenses: Record<string, Record<string, number>> = {};
        for (const exp of data.expenses) {
            const branch = exp.branchName || 'Unknown Branch';
            const category = exp.categoryName || 'Uncategorized';
            if (!groupedExpenses[branch]) {
                groupedExpenses[branch] = {};
            }
            groupedExpenses[branch][category] = (groupedExpenses[branch][category] || 0) + exp.amount;
        }

        const branches = Object.keys(groupedExpenses).sort();
        if (branches.length === 0) {
            expensesHtml = `
                <table class="data-table">
                    <tbody>
                        <tr class="empty-row">
                            <td>No expenses available for this reporting period.</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else {
            for (const branch of branches) {
                const categories = groupedExpenses[branch] || {};
                const categoryNames = Object.keys(categories).sort();
                let branchTotal = 0;

                const categoryRows = categoryNames.map((catName) => {
                    const amount = categories[catName] || 0;
                    branchTotal += amount;
                    return `
                        <tr>
                            <td>${catName}</td>
                            <td class="text-right font-mono">BDT ${formatBDT(amount)}</td>
                        </tr>
                    `;
                }).join('');

                expensesHtml += `
                    <div class="branch-expenses-block" style="margin-bottom: 24px; page-break-inside: avoid;">
                        <h3 class="subsection-title">${branch} Branch</h3>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th class="text-right" style="width: 200px;">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categoryRows}
                            </tbody>
                            <tfoot>
                                <tr style="font-weight: 600;">
                                    <td>Total for ${branch}</td>
                                    <td class="text-right total-value font-mono">BDT ${formatBDT(branchTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;
            }
        }
    } else {
        expensesHtml = monthlySummaries.map((m) => {
            const branches = Object.keys(m.groupedExpenses).sort();
            let monthBranchBlocks = '';

            if (branches.length === 0) {
                monthBranchBlocks = `
                    <table class="data-table" style="margin-bottom: 16px;">
                        <tbody>
                            <tr class="empty-row">
                                <td>No expenses available for this month.</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else {
                for (const branch of branches) {
                    const categories = m.groupedExpenses[branch] || {};
                    const categoryNames = Object.keys(categories).sort();
                    let branchTotal = 0;

                    const categoryRows = categoryNames.map((catName) => {
                        const amount = categories[catName] || 0;
                        branchTotal += amount;
                        return `
                            <tr>
                                <td>${catName}</td>
                                <td class="text-right font-mono">BDT ${formatBDT(amount)}</td>
                            </tr>
                        `;
                    }).join('');

                    monthBranchBlocks += `
                        <div class="branch-expenses-block" style="margin-bottom: 16px; page-break-inside: avoid;">
                            <h4 style="font-size: 11px; font-weight: 600; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; margin-top: 10px;">${branch} Branch</h4>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Category Name</th>
                                        <th class="text-right" style="width: 200px;">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${categoryRows}
                                </tbody>
                                <tfoot>
                                    <tr style="font-weight: 600;">
                                        <td>Total for ${branch}</td>
                                        <td class="text-right total-value font-mono">BDT ${formatBDT(branchTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    `;
                }
            }

            return `
                <div class="month-expenses-block" style="margin-bottom: 32px; page-break-inside: avoid;">
                    <h3 class="subsection-title" style="font-size: 13px; font-weight: 600; color: #1E0078; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 12px; margin-top: 8px;">${m.label} Expenses</h3>
                    ${monthBranchBlocks}
                    <div style="margin-top: 12px; text-align: right; font-weight: 600; font-size: 12px; margin-bottom: 8px;">
                        Total Expenses for ${m.label}: <span class="accent-value font-mono">BDT ${formatBDT(m.expensesBDT)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Generate Debits HTML
    let debitsHtml = '';
    if (months.length <= 1) {
        const debitsRows = data.debits.map((d: any) => `
            <tr>
                <td>${formatDate(d.date)}</td>
                <td>${d.personName}</td>
                <td>${d.type}</td>
                <td>${d.description}</td>
                <td class="text-right font-mono">BDT ${formatBDT(d.amount)}</td>
            </tr>
        `).join('');

        debitsHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Person Name</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th class="text-right" style="width: 150px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${debitsRows || `<tr class="empty-row"><td colspan="5">No debit records available for this reporting period.</td></tr>`}
                </tbody>
                ${debitsRows ? `
                <tfoot>
                    <tr style="font-weight: 600;">
                        <td colspan="3">Total</td>
                        <td class="text-right font-mono" style="font-size: 11px; color: #6B7280; font-weight: normal; line-height: 1.4;">
                            Borrow: BDT ${formatBDT(data.summary.totalBorrowBDT)}<br/>
                            Return: BDT ${formatBDT(data.summary.totalReturnBDT)}
                        </td>
                        <td class="text-right accent-value font-mono">Net: BDT ${formatBDT(data.summary.netDebitBDT)}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        `;
    } else {
        debitsHtml = monthlySummaries.map((m) => {
            const debitsRows = m.debits.map((d: any) => `
                <tr>
                    <td>${formatDate(d.date)}</td>
                    <td>${d.personName}</td>
                    <td>${d.type}</td>
                    <td>${d.description}</td>
                    <td class="text-right font-mono">BDT ${formatBDT(d.amount)}</td>
                </tr>
            `).join('');

            return `
                <div class="month-debits-block" style="margin-bottom: 32px; page-break-inside: avoid;">
                    <h3 class="subsection-title" style="font-size: 13px; font-weight: 600; color: #1E0078; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 12px; margin-top: 8px;">${m.label} Debits</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Person Name</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th class="text-right" style="width: 150px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${debitsRows || `<tr class="empty-row"><td colspan="5">No debit records available for this month.</td></tr>`}
                        </tbody>
                        ${debitsRows ? `
                        <tfoot>
                            <tr style="font-weight: 600;">
                                <td colspan="3">Total for ${m.label}</td>
                                <td class="text-right font-mono" style="font-size: 11px; color: #6B7280; font-weight: normal; line-height: 1.4;">
                                    Borrow: BDT ${formatBDT(m.monthBorrowBDT)}<br/>
                                    Return: BDT ${formatBDT(m.monthReturnBDT)}
                                </td>
                                <td class="text-right accent-value font-mono">Net: BDT ${formatBDT(m.monthBorrowBDT - m.monthReturnBDT)}</td>
                            </tr>
                        </tfoot>` : ''}
                    </table>
                </div>
            `;
        }).join('');
    }

    const netProfit = data.summary.netProfitBDT;
    const isNegativeProfit = netProfit < 0;
    const netProfitValue = isNegativeProfit 
        ? `(BDT ${formatBDT(Math.abs(netProfit))})`
        : `BDT ${formatBDT(netProfit)}`;

    // Monthly breakdown table for the summary section
    let monthlyBreakdownHtml = '';
    if (months.length > 1) {
        monthlyBreakdownHtml = `
        <div class="monthly-breakdown-container" style="margin-top: 28px; width: 100%; max-width: 650px; page-break-inside: avoid;">
            <h4 style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; margin-bottom: 10px;">Monthly Breakdown</h4>
            <table class="monthly-breakdown-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th class="text-right">Gross Revenue</th>
                        <th class="text-right">Operating Expenses</th>
                        <th class="text-right">Net Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthlySummaries.map(m => {
                        const isNeg = m.profitBDT < 0;
                        const profitVal = isNeg ? `(BDT ${formatBDT(Math.abs(m.profitBDT))})` : `BDT ${formatBDT(m.profitBDT)}`;
                        return `
                            <tr>
                                <td style="font-weight: 500;">${m.label}</td>
                                <td class="text-right font-mono">BDT ${formatBDT(m.earningsBDT)}</td>
                                <td class="text-right font-mono">(BDT ${formatBDT(m.expensesBDT)})</td>
                                <td class="text-right font-mono ${isNeg ? 'negative-profit' : 'positive-profit'}" style="font-weight: 600;">${profitVal}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        `;
    }

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
                max-width: 650px;
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
                max-width: 380px;
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

            .monthly-breakdown-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 16px;
            }
            
            .monthly-breakdown-table th {
                padding: 8px 12px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: #6B7280;
                border-bottom: 2px solid #E5E7EB;
                text-align: left;
            }
            
            .monthly-breakdown-table td {
                padding: 10px 12px;
                font-size: 12px;
                color: #111827;
                border-bottom: 1px solid #E5E7EB;
            }
            
            .monthly-breakdown-table tr:last-child td {
                border-bottom: none;
            }
            
            .positive-profit {
                color: #1E0078;
            }
            
            .negative-profit {
                color: #DC2626;
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

            .subsection-title {
                font-size: 11px;
                font-weight: 600;
                color: #4B5563;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-top: 16px;
                margin-bottom: 8px;
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
                tfoot { display: table-row-group; }
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
            ${monthlyBreakdownHtml}
        </section>

        <!-- Earnings Section -->
        <div class="section">
            <h2 class="section-title">Earnings Breakdown</h2>
            ${earningsHtml}
        </div>

        <!-- Expenses Section -->
        <div class="section">
            <h2 class="section-title">Expenses Breakdown</h2>
            ${expensesHtml}
            ${data.expenses.length > 0 ? `
            <div style="margin-top: 16px; text-align: right; font-weight: 600; font-size: 13px;">
                Total Expenses: <span class="accent-value font-mono">BDT ${formatBDT(data.expensesNet)}</span>
            </div>` : ''}
        </div>

        <!-- Debits Section -->
        <div class="section">
            <h2 class="section-title">Debits Breakdown</h2>
            ${debitsHtml}
            ${data.debits.length > 0 ? `
            <div style="margin-top: 16px; text-align: right; font-weight: 600; font-size: 13px;">
                Total Net Debit: <span class="accent-value font-mono">BDT ${formatBDT(data.summary.netDebitBDT)}</span>
            </div>` : ''}
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
