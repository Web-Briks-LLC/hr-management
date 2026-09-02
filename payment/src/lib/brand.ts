/**
 * WebBriks brand constants — mirrors web-briks-client so the payment portal
 * stays visually identical to the main site.
 */

/** Primary CTA gradient (used on every "pay / continue" button). */
export const BRAND_GRADIENT =
    "linear-gradient(134deg, #9C46F4 1.15%, #6A25E0 17.12%, #390CA4 47.7%, #28048B 71.73%)";

export const BRAND = {
    violet: "#9C46F4",
    ink: "#02040A",
    textSecondary: "#D1D5DB",
    textMuted: "#9CA3AF",
    textFaint: "#4B5563",
    ok: "#4ADE80",
    danger: "#F87171",
} as const;
