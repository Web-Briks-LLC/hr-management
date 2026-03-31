import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import {
  Expense,
  ExpenseQueryParams,
} from "@/redux/features/expense/expenseApi";

const C = {
  ink: "#0D1117",
  slate: "#1E293B",
  muted: "#64748B",
  faint: "#94A3B8",
  line: "#E8EDF2",
  bg: "#F7F9FC",
  accent: "#2563EB",
  green: "#16A34A",
  amber: "#D97706",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    backgroundColor: C.white,
    fontFamily: "Helvetica",
    color: C.slate,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 24,
    marginBottom: 32,
    borderBottom: `2px solid ${C.ink}`,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: C.ink,
    letterSpacing: 0.5,
  },
  company: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  headerMeta: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 8,
    color: C.faint,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    color: C.slate,
    fontWeight: "bold",
  },

  // ── Table ────────────────────────────────────────────
  table: { width: "100%" },

  tableHead: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: C.bg,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: `1px solid ${C.line}`,
    alignItems: "center",
  },

  // Column widths
  cDate: { width: "15%" },
  cTitle: { width: "26%" },
  cCategory: { width: "16%" },
  cBranch: { width: "16%" },
  cStatus: { width: "12%" },
  cAmount: { width: "15%", textAlign: "right" },

  headCell: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cell: {
    fontSize: 9,
    color: C.slate,
  },
  cellBold: {
    fontSize: 9,
    fontWeight: "bold",
    color: C.ink,
  },
  cellAmount: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: C.ink,
    textAlign: "right",
  },

  // ── Summary ──────────────────────────────────────────
  summary: {
    marginTop: 36,
    alignItems: "flex-end",
  },
  summaryBox: {
    width: 220,
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: C.muted,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: C.slate,
  },
  divider: {
    borderTop: `1.5px solid ${C.line}`,
    marginTop: 8,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.ink,
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: "bold",
    color: C.accent,
  },

  // ── Footer ───────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${C.line}`,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 7.5,
    color: C.faint,
  },
});

// ── Helpers ─────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const getPeriod = (filters: ExpenseQueryParams): string => {
  if (filters.startDate && filters.endDate)
    return `${filters.startDate} – ${filters.endDate}`;
  if (filters.month && filters.year) {
    const month = format(new Date(2000, filters.month - 1, 1), "MMMM");
    return `${month} ${filters.year}`;
  }
  if (filters.year) return `Year ${filters.year}`;
  if (filters.month) return `Month ${filters.month}`;
  return "All Time";
};

// ── Component ────────────────────────────────────────────

interface ExpenseReportPDFProps {
  expenses: Expense[];
  filters: ExpenseQueryParams;
  totalAmount: number;
}

export const ExpenseReportPDF = ({
  expenses,
  filters,
  totalAmount,
}: ExpenseReportPDFProps) => {
  const period = getPeriod(filters);

  return (
    <Document title={`Expense Report – ${period}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Expense Report</Text>
            <Text style={styles.company}>Web Briks LLC · {period}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.metaLabel}>Generated on</Text>
            <Text style={styles.metaValue}>
              {format(new Date(), "dd MMM yyyy")}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Head */}
          <View style={styles.tableHead}>
            <View style={styles.cDate}>
              <Text style={styles.headCell}>Date</Text>
            </View>
            <View style={styles.cTitle}>
              <Text style={styles.headCell}>Title</Text>
            </View>
            <View style={styles.cCategory}>
              <Text style={styles.headCell}>Category</Text>
            </View>
            <View style={styles.cBranch}>
              <Text style={styles.headCell}>Branch</Text>
            </View>
            <View style={styles.cStatus}>
              <Text style={styles.headCell}>Status</Text>
            </View>
            <View style={styles.cAmount}>
              <Text style={styles.headCell}>Amount</Text>
            </View>
          </View>

          {/* Rows */}
          {expenses.map((expense) => (
            <View style={styles.tableRow} key={expense._id}>
              <View style={styles.cDate}>
                <Text style={styles.cell}>
                  {format(new Date(expense.date), "dd MMM yy")}
                </Text>
              </View>
              <View style={styles.cTitle}>
                <Text style={styles.cellBold}>{expense.title}</Text>
              </View>
              <View style={styles.cCategory}>
                <Text style={styles.cell}>{expense.category?.name || "—"}</Text>
              </View>
              <View style={styles.cBranch}>
                <Text style={styles.cell}>{expense.branch?.name || "—"}</Text>
              </View>
              <View style={styles.cStatus}>
                <Text
                  style={[
                    styles.cell,
                    { color: expense.status === "paid" ? C.green : C.amber },
                  ]}
                >
                  {expense.status === "paid" ? "Paid" : "Pending"}
                </Text>
              </View>
              <View style={styles.cAmount}>
                <Text style={styles.cellAmount}>{fmt(expense.amount)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{expenses.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Currency</Text>
              <Text style={styles.summaryValue}>BDT</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.summaryRow, { marginBottom: 0 }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{fmt(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HR Management System · Auto-generated report
          </Text>
          <Text style={styles.footerText}>webbriks.com</Text>
        </View>
      </Page>
    </Document>
  );
};
