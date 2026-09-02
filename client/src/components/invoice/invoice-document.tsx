/**
 * WebBriks invoice PDF — presentational document.
 *
 * Framework-free (only @react-pdf/renderer + date-fns) so it can be rendered both
 * in the browser (via InvoicePDF.tsx) and from a Node script
 * (scripts/render-invoice-pdf.tsx) for design iteration.
 *
 * Design language derived from the WebBriks quotation (#QTN-2026-0047):
 * predominantly white, editorial/Swiss layout, violet reserved for small
 * intentional accents, deep navy-black headings, thin neutral dividers,
 * a deliberate spacing rhythm (tight within a group, generous between sections).
 */
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Font,
    Link,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { IOrder } from "@/types/order.type";
import type { Client } from "@/types/client.type";

// Keep long words intact instead of hyphenating mid-word
Font.registerHyphenationCallback((word) => [word]);

const palette = {
    brand: "#4E12D4",
    lavenderSoft: "#FBFAFE",
    ink: "#17112E",
    body: "#5F6070",
    faint: "#8A8A94",
    line: "#E6E4EE",
    white: "#FFFFFF",
};

const M = 52; // page side margin

const styles = StyleSheet.create({
    page: {
        paddingTop: 46,
        paddingBottom: 62,
        paddingHorizontal: M,
        fontFamily: "Helvetica",
        fontSize: 9.5,
        color: palette.body,
    },

    /* ===== Centred watermark (painted first, sits behind all content) ===== */
    watermark: {
        position: "absolute",
        top: 300,
        left: 0,
        right: 0,
        alignItems: "center",
        opacity: 0.05,
    },
    watermarkImg: { width: 236, height: 236, objectFit: "contain" },

    /* ===== Masthead ===== */
    masthead: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    mastheadLeft: { paddingTop: 1 },
    // Box tightly wraps the artwork (image ratio ≈ 3.61:1) so it sits flush
    // with the left margin instead of letterboxing inside a wider box.
    logo: {
        height: 30,
        width: 108,
        marginLeft: -3,
        objectFit: "contain",
        objectPositionX: 0,
    },
    mastheadRight: { alignItems: "flex-end" },
    invoiceTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 26,
        letterSpacing: 2,
        color: palette.ink,
        lineHeight: 1,
    },
    invoiceId: {
        fontSize: 8.5,
        color: palette.faint,
        marginTop: 7,
        letterSpacing: 0.3,
    },

    /* ===== Document information ===== */
    infoRule: {
        height: 1,
        backgroundColor: palette.line,
        marginTop: 22,
        marginBottom: 22,
    },
    infoBand: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    infoDates: { flexDirection: "row", gap: 48 },
    amountWrap: { alignItems: "flex-end" },
    amountLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        letterSpacing: 1.4,
        color: palette.brand,
        marginBottom: 7,
        lineHeight: 1,
    },
    amountValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 20,
        color: palette.ink,
        lineHeight: 1,
    },
    metaLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        letterSpacing: 1.4,
        color: palette.faint,
        marginBottom: 6,
        lineHeight: 1,
    },
    metaValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        color: palette.ink,
        lineHeight: 1,
    },

    /* ===== Parties ===== */
    parties: { flexDirection: "row", gap: 40, marginTop: 34 },
    partyCol: { flex: 1 },
    partyLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        letterSpacing: 1.4,
        color: palette.faint,
        marginBottom: 9,
    },
    partyName: {
        fontFamily: "Helvetica-Bold",
        fontSize: 12.5,
        color: palette.ink,
        marginBottom: 5,
    },
    partyText: { fontSize: 9, color: palette.body, lineHeight: 1.55 },
    partyMuted: {
        fontSize: 8.5,
        color: palette.faint,
        lineHeight: 1.5,
        marginTop: 3,
    },

    /* ===== Section heading ===== */
    sectionHeading: {
        fontFamily: "Helvetica-Bold",
        fontSize: 12.5,
        letterSpacing: 0.2,
        color: palette.ink,
        marginTop: 36,
        marginBottom: 10,
    },
    sectionRule: { height: 1, backgroundColor: palette.line },
    sectionLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7.5,
        letterSpacing: 1.4,
        color: palette.brand,
        marginBottom: 9,
    },

    /* ===== Line items ===== */
    tHead: {
        flexDirection: "row",
        marginTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
    },
    tHeadCell: {
        fontFamily: "Helvetica-Bold",
        fontSize: 7,
        letterSpacing: 1,
        color: palette.faint,
    },
    tRow: {
        flexDirection: "row",
        paddingVertical: 11,
        paddingHorizontal: 2,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.line,
    },
    tCell: { fontSize: 9, color: palette.body, lineHeight: 1.4 },
    tDesc: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9.5,
        color: palette.ink,
        lineHeight: 1.4,
    },
    tAmount: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: palette.ink,
        lineHeight: 1.4,
    },
    cNo: { width: "5%" },
    cDate: { width: "16%" },
    cDesc: { width: "41%", paddingRight: 12 },
    cQty: { width: "10%", textAlign: "right" },
    cRate: { width: "14%", textAlign: "right" },
    cAmt: { width: "14%", textAlign: "right" },

    /* ===== Summary ===== */
    summary: { flexDirection: "row", gap: 44, marginTop: 32 },
    terms: { flex: 1 },
    termsText: {
        fontSize: 8.5,
        color: palette.body,
        lineHeight: 1.6,
        marginBottom: 7,
    },
    totalsBox: { width: 222 },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 2,
    },
    totalsLabel: { fontSize: 9, color: palette.faint, lineHeight: 1 },
    totalsValue: { fontSize: 9, color: palette.body, lineHeight: 1 },
    totalsDivider: {
        height: 1,
        backgroundColor: palette.line,
        marginVertical: 4,
        marginHorizontal: 2,
    },
    grandBlock: {
        marginTop: 8,
        paddingTop: 11,
        paddingHorizontal: 2,
        borderTopWidth: 1.5,
        borderTopColor: palette.ink,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
    },
    grandLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        letterSpacing: 1.3,
        color: palette.brand,
        lineHeight: 1,
    },
    grandValue: {
        fontFamily: "Helvetica-Bold",
        fontSize: 16,
        color: palette.ink,
        lineHeight: 1,
    },

    /* ===== Payment CTA ===== */
    cta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginTop: 32,
        backgroundColor: palette.lavenderSoft,
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    ctaBody: { flex: 1 },
    ctaHeading: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9.5,
        color: palette.ink,
        marginBottom: 4,
    },
    ctaText: { fontSize: 8, color: palette.body, lineHeight: 1.55 },
    ctaBtn: {
        backgroundColor: palette.brand,
        borderRadius: 6,
        paddingVertical: 11,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaBtnText: {
        fontFamily: "Helvetica-Bold",
        color: palette.white,
        fontSize: 8.5,
        letterSpacing: 0.8,
        lineHeight: 1,
    },

    /* ===== Footer ===== */
    footer: {
        position: "absolute",
        bottom: 26,
        left: M,
        right: M,
        height: 28,
    },
    footerRule: {
        height: 1,
        backgroundColor: palette.line,
        marginBottom: 8,
    },
    footerText: {
        fontSize: 7,
        color: palette.faint,
        lineHeight: 1,
        textAlign: "center",
        letterSpacing: 0.3,
    },
});

export interface InvoicePDFProps {
    client: Pick<
        Client,
        | "_id"
        | "clientId"
        | "name"
        | "emails"
        | "currency"
        | "address"
        | "officeAddress"
    >;
    orders: IOrder[];
    month: string;
    year: string;
    invoiceNumber: string;
    paymentToken?: string;
    totals: {
        totalImages: number;
        totalAmount: number;
    };
}

export const InvoiceDocument = ({
    client,
    orders,
    totals,
    invoiceNumber,
    paymentToken,
}: InvoicePDFProps) => {
    const issueDate = format(new Date(), "MMM d, yyyy");
    const dueDate = format(
        new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        "MMM d, yyyy",
    );
    const logoUrl =
        "https://res.cloudinary.com/dny7zfbg9/image/upload/v1777996436/q83auvamwih8u8ftw5zu.png";
    const watermarkUrl =
        "https://res.cloudinary.com/dny7zfbg9/image/upload/v1780327707/lnb5suhev8hzgixi0bbp.png";

    const invoiceLabel = `#${String(invoiceNumber).replace(/^#/, "")}`;

    const fmt = (amount: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: client.currency || "USD",
        }).format(amount);

    const clientAddress =
        client.address && client.address !== "N/A"
            ? client.address
            : client.officeAddress && client.officeAddress !== "N/A"
              ? client.officeAddress
              : "Address not provided";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Centred watermark — rendered first so all content paints over it */}
                <View style={styles.watermark} fixed>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={watermarkUrl} style={styles.watermarkImg} />
                </View>

                {/* ===== Masthead ===== */}
                <View style={styles.masthead}>
                    <View style={styles.mastheadLeft}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={logoUrl} style={styles.logo} />
                    </View>
                    <View style={styles.mastheadRight}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text style={styles.invoiceId}>
                            Invoice {invoiceLabel}
                        </Text>
                    </View>
                </View>

                {/* ===== Document information ===== */}
                <View style={styles.infoRule} />
                <View style={styles.infoBand}>
                    <View style={styles.infoDates}>
                        <View>
                            <Text style={styles.metaLabel}>ISSUE DATE</Text>
                            <Text style={styles.metaValue}>{issueDate}</Text>
                        </View>
                        <View>
                            <Text style={styles.metaLabel}>DUE DATE</Text>
                            <Text style={styles.metaValue}>{dueDate}</Text>
                        </View>
                    </View>
                    <View style={styles.amountWrap}>
                        <Text style={styles.amountLabel}>AMOUNT DUE</Text>
                        <Text style={styles.amountValue}>
                            {fmt(totals.totalAmount)}
                        </Text>
                    </View>
                </View>

                {/* ===== Parties ===== */}
                <View style={styles.parties}>
                    <View style={styles.partyCol}>
                        <Text style={styles.partyLabel}>BILL FROM</Text>
                        <Text style={styles.partyName}>WEB BRIKS LLC</Text>
                        <Text style={styles.partyText}>
                            1209 Mountain Road PL NE, STE R
                        </Text>
                        <Text style={styles.partyText}>
                            Albuquerque, NM 87110
                        </Text>
                        <Text style={styles.partyText}>United States</Text>
                        <Text style={styles.partyMuted}>
                            Federal Tax ID (EIN): 30-1421814
                        </Text>
                        <Text style={styles.partyMuted}>
                            VAT ID: Not Applicable — U.S. Entity
                        </Text>
                    </View>
                    <View style={styles.partyCol}>
                        <Text style={styles.partyLabel}>BILL TO</Text>
                        <Text style={styles.partyName}>{client.name}</Text>
                        <Text style={styles.partyText}>{clientAddress}</Text>
                        {client.clientId ? (
                            <Text style={styles.partyMuted}>
                                Client ID: {client.clientId}
                            </Text>
                        ) : null}
                        {client.emails && client.emails[0] ? (
                            <Text style={styles.partyMuted}>
                                {client.emails[0]}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* ===== Line items ===== */}
                <Text style={styles.sectionHeading}>Line Items</Text>
                <View style={styles.sectionRule} />

                <View style={styles.tHead} fixed>
                    <Text style={[styles.tHeadCell, styles.cNo]}>#</Text>
                    <Text style={[styles.tHeadCell, styles.cDate]}>DATE</Text>
                    <Text style={[styles.tHeadCell, styles.cDesc]}>
                        DESCRIPTION
                    </Text>
                    <Text style={[styles.tHeadCell, styles.cQty]}>QTY</Text>
                    <Text style={[styles.tHeadCell, styles.cRate]}>RATE</Text>
                    <Text style={[styles.tHeadCell, styles.cAmt]}>AMOUNT</Text>
                </View>
                {orders.map((order, index) => (
                    <View style={styles.tRow} key={order._id} wrap={false}>
                        <Text style={[styles.tCell, styles.cNo]}>
                            {index + 1}
                        </Text>
                        <Text style={[styles.tCell, styles.cDate]}>
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                        </Text>
                        <Text style={[styles.tDesc, styles.cDesc]}>
                            {order.orderName}
                        </Text>
                        <Text style={[styles.tCell, styles.cQty]}>
                            {order.imageQuantity}
                        </Text>
                        <Text style={[styles.tCell, styles.cRate]}>
                            {fmt(order.perImagePrice)}
                        </Text>
                        <Text style={[styles.tAmount, styles.cAmt]}>
                            {fmt(order.totalPrice)}
                        </Text>
                    </View>
                ))}

                {/* ===== Summary: terms + totals ===== */}
                <View style={styles.summary} wrap={false}>
                    <View style={styles.terms}>
                        <Text style={styles.sectionLabel}>PAYMENT TERMS</Text>
                        <Text style={styles.termsText}>
                            Payment is due within 7 days of the issue date.
                            Please reference invoice {invoiceLabel} with your
                            payment.
                        </Text>
                        <Text style={styles.termsText}>
                            Thank you for your business. Questions about this
                            invoice? Email info@webbriks.com.
                        </Text>
                    </View>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Subtotal</Text>
                            <Text style={styles.totalsValue}>
                                {fmt(totals.totalAmount)}
                            </Text>
                        </View>
                        <View style={styles.totalsDivider} />
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Tax</Text>
                            <Text style={styles.totalsValue}>{fmt(0)}</Text>
                        </View>
                        <View style={styles.grandBlock}>
                            <Text style={styles.grandLabel}>TOTAL DUE</Text>
                            <Text style={styles.grandValue}>
                                {fmt(totals.totalAmount)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ===== Payment CTA ===== */}
                <View style={styles.cta} wrap={false}>
                    <View style={styles.ctaBody}>
                        <Text style={styles.ctaHeading}>
                            Secure online payment
                        </Text>
                        <Text style={styles.ctaText}>
                            Pay by Credit Card, Debit Card, or PayPal through our
                            protected portal. Tap &quot;Pay Invoice&quot; to view
                            and settle this invoice instantly.
                        </Text>
                    </View>
                    <Link
                        src={`${process.env.NEXT_PUBLIC_PAYMENT_URL!}/payment/${invoiceNumber}?token=${paymentToken || ""}`}
                        style={{ textDecoration: "none" }}
                    >
                        <View style={styles.ctaBtn}>
                            <Text style={styles.ctaBtnText}>PAY INVOICE</Text>
                        </View>
                    </Link>
                </View>

                {/* ===== Footer ===== */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerRule} />
                    <Text style={styles.footerText}>
                        WEB BRIKS LLC · Excellence in Editing &amp; Design ·
                        info@webbriks.com
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
