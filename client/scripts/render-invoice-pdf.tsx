/**
 * Render the WebBriks invoice PDF from Node for design iteration / previews.
 *
 * Uses the SAME presentational component the app ships
 * (src/components/invoice/invoice-document.tsx), so whatever this produces is
 * exactly what clients receive.
 *
 * Usage:
 *   npx tsx scripts/render-invoice-pdf.tsx [outfile.pdf]
 *
 * Edit the `sampleProps` below to preview a different invoice.
 */
import ReactPDF from "@react-pdf/renderer";
import {
    InvoiceDocument,
    type InvoicePDFProps,
} from "../src/components/invoice/invoice-document";
import type { IOrder } from "../src/types/order.type";

process.env.NEXT_PUBLIC_PAYMENT_URL ??= "https://pay.webbriks.com";

const out = process.argv[2] || "webbriks-invoice-redesigned.pdf";

const item = (
    id: string,
    orderName: string,
    orderDate: string,
    imageQuantity: number,
    perImagePrice: number,
): IOrder =>
    ({
        _id: id,
        orderName,
        orderDate,
        imageQuantity,
        perImagePrice,
        totalPrice: imageQuantity * perImagePrice,
    }) as unknown as IOrder;

// ── Invoice #60 (content preserved verbatim from the source invoice) ──────────
const orders: IOrder[] = [
    item("1", "Product photo retouch", "2026-08-23T00:00:00.000Z", 6, 0),
    item("2", "SHA__X__4", "2026-08-23T00:00:00.000Z", 6, 0),
];

const sampleProps: InvoicePDFProps = {
    client: {
        _id: "wb-10006",
        clientId: "WB-10006",
        name: "John Doe",
        emails: ["doe@gmail.com"],
        currency: "USD",
        address: "GA, Station - 4399, USA",
        officeAddress: "GA, Station - 4399, USA",
    },
    orders,
    month: "9",
    year: "2026",
    invoiceNumber: "60",
    paymentToken: "preview-token",
    totals: {
        totalImages: orders.reduce((s, o) => s + o.imageQuantity, 0),
        totalAmount: orders.reduce((s, o) => s + o.totalPrice, 0),
    },
};

ReactPDF.renderToFile(<InvoiceDocument {...sampleProps} />, out)
    .then(() => console.log(`Rendered ${out}`))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
