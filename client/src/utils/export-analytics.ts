import { saveAs } from "file-saver";
import { IFinanceAnalytics } from "@/types/analytics.type";

// ─── Excel Export ────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";

export const exportAnalyticsToExcel = async (
  data: IFinanceAnalytics,
  options: {
    year?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  try {
    const query = new URLSearchParams();
    if (options.startDate && options.endDate) {
      query.append("startDate", options.startDate);
      query.append("endDate", options.endDate);
    } else {
      if (options.year) query.append("year", options.year);
      if (options.month && options.month !== "all") query.append("month", options.month);
    }

    const response = await fetch(`${API_URL}/api/analytics/finance/export/excel?${query.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to export Excel");

    const blob = await response.blob();
    const filename = options.startDate && options.endDate
      ? `Finance_Report_${options.startDate}_to_${options.endDate}.xlsx`
      : `Finance_Report_${options.year || "all"}_${options.month || "all"}.xlsx`;
    saveAs(blob, filename);
  } catch (error) {
    console.error("Error exporting Excel:", error);
  }
};

// ─── PDF Export ──────────────────────────────────────────────────────────────

export const exportAnalyticsToPDF = async (
  data: IFinanceAnalytics,
  options: {
    year?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  try {
    const query = new URLSearchParams();
    if (options.startDate && options.endDate) {
      query.append("startDate", options.startDate);
      query.append("endDate", options.endDate);
    } else {
      if (options.year) query.append("year", options.year);
      if (options.month && options.month !== "all") query.append("month", options.month);
    }

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
    const filename = options.startDate && options.endDate
      ? `Finance_Report_${options.startDate}_to_${options.endDate}.pdf`
      : `Finance_Report_${options.year || "all"}_${options.month || "all"}.pdf`;
    saveAs(blob, filename);
  } catch (error) {
    console.error("Error exporting PDF:", error);
  }
};
