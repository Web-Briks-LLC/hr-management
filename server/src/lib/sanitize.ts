/**
 * Escapes special regex characters in a string to prevent
 * ReDoS (Regular Expression Denial of Service) attacks.
 *
 * Use this whenever user-supplied input is used in a $regex query.
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
