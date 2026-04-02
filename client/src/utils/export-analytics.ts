import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { IFinanceAnalytics } from "@/types/analytics.type";

const formatAmount = (amount: number) =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getPeriodLabel = (month: string, year: string) =>
  `${month === "all" ? "All Months" : month}, ${year}`;

// ─── Excel Export ────────────────────────────────────────────────────────────

export const exportAnalyticsToExcel = (
  data: IFinanceAnalytics,
  year: string,
  month: string,
) => {
  const { summary, monthlyTrends, clientBreakdown, expensesByCategory } = data;
  const wb = XLSX.utils.book_new();

  // Summary
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Finance Analytics Summary"],
    ["Period", getPeriodLabel(month, year)],
    [],
    ["Metric", "Amount"],
    ["Total Earnings", summary.totalEarnings],
    ["Total Expenses", summary.totalExpenses],
    ["Net Profit", summary.totalProfit],
    ["Total Shared", summary.totalShared],
    ["Final Amount", summary.finalAmount],
    [],
    ["Unpaid Revenue by Currency"],
    ...(summary.unpaidByCurrency || []).map((i) => [i.currency, i.amount]),
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Monthly Trends
  const trendsSheet = XLSX.utils.aoa_to_sheet([
    ["Month", "Earnings", "Expenses", "Profit", "Orders", "Order Revenue"],
    ...monthlyTrends.map((t) => [
      t.monthName,
      t.earnings,
      t.expenses,
      t.profit,
      t.orderCount,
      t.orderRevenue,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, trendsSheet, "Monthly Trends");

  // Client Breakdown
  const clientSheet = XLSX.utils.aoa_to_sheet([
    [
      "Client Name",
      "Paid Earnings",
      "Total Revenue",
      "Unpaid Revenue",
      "Total Orders",
    ],
    ...clientBreakdown.map((c) => [
      c.clientName,
      c.totalEarnings,
      c.totalRevenue,
      c.unpaidRevenue,
      c.totalOrders,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, clientSheet, "Client Breakdown");

  // Expenses
  const expenseSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Amount"],
    ...expensesByCategory.map((e) => [e.categoryName, e.total]),
  ]);
  XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    `Finance_Report_${year}_${month}.xlsx`,
  );
};

// ─── PDF Export ──────────────────────────────────────────────────────────────

const COLORS = {
  blue: [41, 128, 185] as [number, number, number],
  green: [39, 174, 96] as [number, number, number],
  purple: [142, 68, 173] as [number, number, number],
  red: [192, 57, 43] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
};

export const exportAnalyticsToPDF = (
  data: IFinanceAnalytics,
  year: string,
  month: string,
) => {
  const { summary, monthlyTrends, clientBreakdown, expensesByCategory } = data;
  const doc = new jsPDF();
  const period = getPeriodLabel(month, year);

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Finance Analytics Report", 14, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text(`Period: ${period}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
  doc.setTextColor(0, 0, 0);

  const section = (label: string, y: number) => {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
  };

  const nextY = () => {
    // @ts-expect-error - injected by jspdf-autotable at runtime
    const y = doc.lastAutoTable.finalY + 14;
    if (y > 245) {
      doc.addPage();
      return 18;
    }
    return y;
  };

  // 1. Summary
  const unpaidText =
    (summary.unpaidByCurrency || [])
      .map((i) => `${i.currency} ${formatAmount(i.amount)}`)
      .join(", ") || "—";

  section("Summary Overview", 46);
  autoTable(doc, {
    startY: 50,
    head: [["Metric", "Amount"]],
    body: [
      ["Total Earnings", formatAmount(summary.totalEarnings)],
      ["Total Expenses", formatAmount(summary.totalExpenses)],
      ["Net Profit", formatAmount(summary.totalProfit)],
      ["Total Shared", formatAmount(summary.totalShared)],
      ["Final Amount", formatAmount(summary.finalAmount)],
      ["Unpaid Revenue", unpaidText],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.blue },
    columnStyles: { 1: { halign: "right" } },
  });

  // 2. Monthly Trends
  let y = nextY();
  section("Monthly Trends", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Month", "Earnings", "Expenses", "Profit", "Orders"]],
    body: monthlyTrends.map((t) => [
      t.monthName,
      formatAmount(t.earnings),
      formatAmount(t.expenses),
      formatAmount(t.profit),
      t.orderCount,
    ]),
    theme: "grid",
    headStyles: { fillColor: COLORS.green },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "center" },
    },
  });

  // 3. Top Clients
  y = nextY();
  section("Top Clients", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Client", "Paid Earnings", "Total Revenue", "Orders"]],
    body: clientBreakdown
      .slice(0, 10)
      .map((c) => [
        c.clientName,
        formatAmount(c.totalEarnings),
        formatAmount(c.totalRevenue),
        c.totalOrders,
      ]),
    theme: "striped",
    headStyles: { fillColor: COLORS.purple },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "center" },
    },
  });

  // 4. Expenses by Category
  y = nextY();
  section("Expenses by Category", y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Category", "Amount"]],
    body: expensesByCategory.map((e) => [
      e.categoryName,
      formatAmount(e.total),
    ]),
    theme: "striped",
    headStyles: { fillColor: COLORS.red },
    columnStyles: { 1: { halign: "right" } },
  });

  doc.save(`Finance_Report_${year}_${month}.pdf`);
};
