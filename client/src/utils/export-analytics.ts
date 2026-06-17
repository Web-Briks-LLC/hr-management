import { saveAs } from "file-saver";
import { IFinanceAnalytics } from "@/types/analytics.type";

// ─── Excel Export ────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";

export const exportAnalyticsToExcel = async (
  data: IFinanceAnalytics,
  year: string,
  month: string,
) => {
  try {
    const query = new URLSearchParams({ year });
    if (month !== "all") query.append("month", month);

    const response = await fetch(`${API_URL}/api/analytics/finance/export/excel?${query.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to export Excel");

    const blob = await response.blob();
    saveAs(blob, `Finance_Report_${year}_${month}.xlsx`);
  } catch (error) {
    console.error("Error exporting Excel:", error);
  }
};

// ─── PDF Export ──────────────────────────────────────────────────────────────

export const exportAnalyticsToPDF = async (
  data: IFinanceAnalytics,
  year: string,
  month: string,
) => {
  try {
    const query = new URLSearchParams({ year });
    if (month !== "all") query.append("month", month);

    const response = await fetch(`${API_URL}/api/analytics/finance/export/pdf?${query.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Server error data:", errData);
        throw new Error(`Failed to export PDF: ${errData.error || response.statusText}`);
    }

    const blob = await response.blob();
    saveAs(blob, `Finance_Report_${year}_${month}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
  }
};
