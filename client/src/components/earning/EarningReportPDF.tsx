import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import {
  IEarning,
  EarningFilters,
  CURRENCY_SYMBOLS,
} from "@/types/earning.type";

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
    padding: 32,
    backgroundColor: C.white,
    fontFamily: "Helvetica",
    color: C.slate,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 20,
    marginBottom: 24,
    borderBottom: `2px solid ${C.ink}`,
  },
  title: {
    fontSize: 20,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: `1px solid ${C.line}`,
    alignItems: "center",
  },

  // Column widths
  cClient: { width: "16%" },
  cPeriod: { width: "10%" },
  cImages: { width: "6%", textAlign: "center" },
  cAmount: { width: "10%", textAlign: "right" },
  cCharges: { width: "10%", textAlign: "right" },
  cRate: { width: "8%", textAlign: "right" },
  cPaid: { width: "10%", textAlign: "right" },
  cBDT: { width: "18%", textAlign: "right" },
  cStatus: { width: "12%", textAlign: "right" },

  headCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cell: {
    fontSize: 8,
    color: C.slate,
  },
  cellBold: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: C.ink,
  },
  cellAmount: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: C.ink,
    textAlign: "right",
  },

  // ── Summary ──────────────────────────────────────────
  summary: {
    marginTop: 32,
    alignItems: "flex-end",
  },
  summaryBox: {
    width: 240,
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 8.5,
    color: C.muted,
  },
  summaryValue: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: C.slate,
  },
  divider: {
    borderTop: `1px solid ${C.line}`,
    marginTop: 6,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: C.ink,
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.accent,
  },

  // ── Footer ───────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${C.line}`,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: C.faint,
  },
});

// ── Helpers ─────────────────────────────────────────────

const fmt = (amount: number, curr: string = "BDT") => {
  const safeAmount = Number(amount) || 0;
  if (curr === "BDT") {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  }
  return safeAmount.toFixed(2);
};

const getPeriod = (filters: EarningFilters): string => {
  if (filters.filterType === "month" && filters.month && filters.year) {
    const month = format(new Date(2000, filters.month - 1, 1), "MMMM");
    return `${month} ${filters.year}`;
  }
  if (filters.filterType === "year" && filters.year) return `Year ${filters.year}`;
  if (filters.filterType === "today") return "Today";
  if (filters.filterType === "week") return "This Week";
  return "All Time";
};

const getMonthLabel = (m: number) => {
  return format(new Date(2000, m - 1, 1), "MMM");
};

// ── Component ────────────────────────────────────────────

interface EarningReportPDFProps {
  earnings: IEarning[];
  filters: EarningFilters;
  totalPaidBDT: number;
  totalAmountUSD: number;
}

export const EarningReportPDF = ({
  earnings,
  filters,
  totalPaidBDT,
  totalAmountUSD,
}: EarningReportPDFProps) => {
  const period = getPeriod(filters);

  return (
    <Document title={`Earnings Report – ${period}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Earnings Report</Text>
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
            <View style={styles.cClient}>
              <Text style={styles.headCell}>Client</Text>
            </View>
            <View style={styles.cPeriod}>
              <Text style={styles.headCell}>Period</Text>
            </View>
            <View style={styles.cImages}>
              <Text style={styles.headCell}>Img</Text>
            </View>
            <View style={styles.cAmount}>
              <Text style={styles.headCell}>Amount</Text>
            </View>
            <View style={styles.cCharges}>
              <Text style={styles.headCell}>Charges</Text>
            </View>
            <View style={styles.cRate}>
              <Text style={styles.headCell}>Rate</Text>
            </View>
            <View style={styles.cPaid}>
              <Text style={styles.headCell}>Paid</Text>
            </View>
            <View style={styles.cBDT}>
              <Text style={styles.headCell}>Net BDT</Text>
            </View>
            <View style={styles.cStatus}>
              <Text style={styles.headCell}>Status</Text>
            </View>
          </View>

          {/* Rows */}
          {earnings.map((earning) => (
            <View style={styles.tableRow} key={earning._id}>
              <View style={styles.cClient}>
                <Text style={styles.cellBold}>{earning.clientId?.name || "—"}</Text>
                <Text style={styles.cell}>{earning.clientId?.clientId || ""}</Text>
              </View>
              <View style={styles.cPeriod}>
                <Text style={styles.cell}>
                  {getMonthLabel(earning.month)} {earning.year}
                </Text>
              </View>
              <View style={styles.cImages}>
                <Text style={styles.cell}>{earning.imageQty || 0}</Text>
              </View>
              <View style={styles.cAmount}>
                <Text style={styles.cellAmount}>
                  {fmt(earning.totalAmount, earning.currency)}
                </Text>
              </View>
              <View style={styles.cCharges}>
                <Text style={styles.cell}>
                  {fmt((earning.fees || 0) + (earning.tax || 0), earning.currency)}
                </Text>
              </View>
              <View style={styles.cRate}>
                <Text style={styles.cell}>
                  {earning.conversionRate || "—"}
                </Text>
              </View>
              <View style={styles.cPaid}>
                <Text style={styles.cell}>
                  {fmt(earning.paidAmount, earning.currency)}
                </Text>
              </View>
              <View style={styles.cBDT}>
                <Text style={styles.cell}>
                  {fmt(earning.paidAmountBDT, "BDT")}
                </Text>
              </View>
              <View style={styles.cStatus}>
                <Text
                  style={[
                    styles.cell,
                    { color: earning.status === "paid" ? C.green : C.amber, fontWeight: "bold" },
                  ]}
                >
                  {earning.status === "paid" ? "Paid" : "Pending"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Records</Text>
              <Text style={styles.summaryValue}>{earnings.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total USD Amount</Text>
              <Text style={styles.summaryValue}>{fmt(totalAmountUSD, "USD")}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.summaryRow, { marginBottom: 0 }]}>
              <Text style={styles.totalLabel}>Total Paid (BDT)</Text>
              <Text style={styles.totalAmount}>{fmt(totalPaidBDT, "BDT")}</Text>
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
