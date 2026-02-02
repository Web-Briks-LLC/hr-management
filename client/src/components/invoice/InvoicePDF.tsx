'use client';

import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    PDFViewer,
    PDFDownloadLink,
    Font,
    pdf,
} from '@react-pdf/renderer';
import type { IOrder } from '@/types/order.type';
import type { Client } from '@/types/client.type';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useSendInvoiceEmailMutation } from '@/redux/features/invoice/invoiceApi';

// Register fonts if needed (optional)
Font.register({
    family: 'Open Sans',
    fonts: [
        {
            src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf',
        },
        {
            src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf',
            fontWeight: 600,
        },
        {
            src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf',
            fontWeight: 700,
        },
    ],
});

const colors = {
    orange: '#FF8A00',
    teal: '#009999',
    gray: '#464646',
    lightGray: '#F0F0F0',
    white: '#FFFFFF',
    border: '#E0E0E0',
};

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
        paddingBottom: 60, // Space for footer
    },
    // Top Orange Bar
    topBar: {
        height: 8,
        backgroundColor: colors.orange,
        width: '100%',
    },
    // Header Section
    headerContainer: {
        marginHorizontal: 40,
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 100, // Fixed height for header area
    },
    logoContainer: {
        width: 150,
        height: 70,
        justifyContent: 'center',
    },
    logo: {
        width: '100%',
        objectFit: 'contain',
    },
    invoiceDetailsContainer: {
        alignItems: 'flex-end',
    },
    invoiceTitle: {
        fontSize: 32,
        fontWeight: 'bold', // Helvetica bold
        color: colors.teal,
        marginBottom: 5,
    },
    titleUnderline: {
        height: 4,
        width: 140,
        backgroundColor: colors.orange,
        marginBottom: 15,
    },
    invoiceDetailText: {
        fontSize: 11,
        color: colors.gray,
        marginBottom: 4,
    },

    // Bill From / Bill To Section
    addressContainer: {
        flexDirection: 'row',
        marginHorizontal: 40,
        marginTop: 40,
        justifyContent: 'space-between',
        gap: 30, // Gap between boxes
    },
    addressBox: {
        flex: 1,
        flexDirection: 'row', // For the left accent bar
        height: 90, // Fixed height or minHeight
    },
    accentBar: {
        width: 8,
        height: '100%',
    },
    addressContent: {
        flex: 1,
        padding: 15, // Inner padding
    },
    // Bill From Specifics
    billFromBox: {
        backgroundColor: colors.teal,
    },
    billFromAccent: {
        backgroundColor: colors.orange,
    },
    billFromText: {
        color: colors.white,
    },
    // Bill To Specifics
    billToBox: {
        backgroundColor: colors.orange,
    },
    billToAccent: {
        backgroundColor: colors.teal,
    },
    billToText: {
        color: colors.white,
    },

    boxTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    boxText: {
        fontSize: 9,
        marginBottom: 2,
        lineHeight: 1.3,
    },

    // Table Section
    tableContainer: {
        marginTop: 40,
        marginHorizontal: 40,
        borderTopWidth: 0.5,
        borderLeftWidth: 0.5,
        borderColor: colors.border,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.teal,
    },
    tableHeaderText: {
        color: colors.white,
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 8,
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: colors.border,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableRowEven: {
        backgroundColor: colors.lightGray,
    },
    tableCell: {
        fontSize: 9,
        color: colors.gray,
        textAlign: 'center',
        paddingVertical: 8,
        borderRightWidth: 0.5,
        borderBottomWidth: 0.5,
        borderColor: colors.border,
    },

    // Column Widths
    colNo: { width: '8%' },
    colDate: { width: '17%' },
    colName: { width: '35%', textAlign: 'left', paddingLeft: 5 },
    colQty: { width: '10%' },
    colRate: { width: '15%' },
    colTotal: { width: '15%' },

    // Total Section
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 25,
        marginHorizontal: 40,
    },
    totalBox: {
        width: 180,
        height: 40,
        flexDirection: 'row',
        backgroundColor: colors.orange,
    },
    totalAccent: {
        width: 8,
        height: '100%',
        backgroundColor: colors.teal,
    },
    totalContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    totalLabel: {
        color: colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    totalValue: {
        color: colors.white,
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Footer Section
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: colors.teal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 9,
        color: colors.white,
        textAlign: 'center',
    },

    // Page number
    pageNumber: {
        position: 'absolute',
        bottom: 35,
        right: 40,
        fontSize: 8,
        color: colors.gray,
    },
});

export interface InvoicePDFProps {
    client: Client;
    orders: IOrder[];
    month: string;
    year: string;
    invoiceNumber: string;
    totals: {
        totalImages: number;
        totalAmount: number;
    };
}

// Table Header Component - fixed for multi-page
const TableHeader = () => (
    <View style={styles.tableHeader} fixed>
        <Text style={[styles.tableHeaderText, styles.colNo]}>No.</Text>
        <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
        <Text style={[styles.tableHeaderText, styles.colName]}>Order Name</Text>
        <Text style={[styles.tableHeaderText, styles.colQty]}>Image QTY</Text>
        <Text style={[styles.tableHeaderText, styles.colRate]}>Per Image</Text>
        <Text style={[styles.tableHeaderText, styles.colTotal]}>Sub Total</Text>
    </View>
);

// Table Row Component - wrap={false} prevents row splitting across pages
const TableRow = ({
    order,
    index,
    formatCurrency,
}: {
    order: IOrder;
    index: number;
    formatCurrency: (n: number) => string;
}) => (
    <View
        style={[styles.tableRow, index % 2 !== 0 ? styles.tableRowEven : {}]}
        wrap={false}
    >
        <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
        <Text style={[styles.tableCell, styles.colDate]}>
            {format(new Date(order.orderDate), 'MMM do, yyyy')}
        </Text>
        <Text style={[styles.tableCell, styles.colName]}>
            {order.orderName}
        </Text>
        <Text style={[styles.tableCell, styles.colQty]}>
            {order.imageQuantity}
        </Text>
        <Text style={[styles.tableCell, styles.colRate]}>
            {formatCurrency(order.perImagePrice)}
        </Text>
        <Text style={[styles.tableCell, styles.colTotal]}>
            {formatCurrency(order.totalPrice)}
        </Text>
    </View>
);

export const InvoiceDocument = ({
    client,
    orders,
    month,
    year,
    totals,
    invoiceNumber,
}: InvoicePDFProps) => {
    const issueDate = format(new Date(), 'MMMM do, yyyy');
    const logoUrl =
        'https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: client.currency || 'USD',
        }).format(amount);
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Top Bar */}
                <View style={styles.topBar} fixed />

                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoContainer}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={logoUrl} style={styles.logo} />
                    </View>
                    <View style={styles.invoiceDetailsContainer}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <View style={styles.titleUnderline} />
                        <Text style={styles.invoiceDetailText}>
                            Invoice No: {invoiceNumber}
                        </Text>
                        <Text style={styles.invoiceDetailText}>
                            Date: {issueDate}
                        </Text>
                    </View>
                </View>

                {/* Bill From / To */}
                <View style={styles.addressContainer}>
                    {/* Bill From (Left) - Teal Box */}
                    <View style={styles.addressBox}>
                        <View
                            style={[styles.accentBar, styles.billFromAccent]}
                        />
                        <View
                            style={[styles.addressContent, styles.billFromBox]}
                        >
                            <Text
                                style={[styles.boxTitle, styles.billFromText]}
                            >
                                BILL FROM
                            </Text>
                            <Text style={[styles.boxText, styles.billFromText]}>
                                Web Briks LLC
                            </Text>
                            <Text style={[styles.boxText, styles.billFromText]}>
                                1209 Mountain Road PL NE,
                            </Text>
                            <Text style={[styles.boxText, styles.billFromText]}>
                                STE R, Albuquerque, NM 87110, US
                            </Text>
                        </View>
                    </View>

                    {/* Bill To (Right) - Orange Box */}
                    <View style={styles.addressBox}>
                        <View style={[styles.accentBar, styles.billToAccent]} />
                        <View style={[styles.addressContent, styles.billToBox]}>
                            <Text style={[styles.boxTitle, styles.billToText]}>
                                BILL TO
                            </Text>
                            <Text style={[styles.boxText, styles.billToText]}>
                                {client.name}
                            </Text>
                            <Text style={[styles.boxText, styles.billToText]}>
                                {client.address && client.address !== 'N/A'
                                    ? client.address
                                    : client.officeAddress &&
                                        client.officeAddress !== 'N/A'
                                      ? client.officeAddress
                                      : 'Address not provided'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.tableContainer}>
                    <TableHeader />
                    {orders.map((order, index) => (
                        <TableRow
                            key={order._id}
                            order={order}
                            index={index}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </View>

                {/* Total Block */}
                <View style={styles.totalContainer} wrap={false}>
                    <View style={styles.totalBox}>
                        <View style={styles.totalAccent} />
                        <View style={styles.totalContent}>
                            <Text style={styles.totalLabel}>TOTAL</Text>
                            <Text style={styles.totalValue}>
                                {formatCurrency(totals.totalAmount)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Web Briks LLC — Excellence in Editing and Design. For
                        inquiry info@webbriks.com
                    </Text>
                </View>

                {/* Page Numbers */}
                <Text
                    style={styles.pageNumber}
                    render={({ pageNumber, totalPages }) =>
                        `Page ${pageNumber} of ${totalPages}`
                    }
                    fixed
                />
            </Page>
        </Document>
    );
};

export default function InvoicePDF(props: InvoicePDFProps) {
    const fileName = `Invoice_${props.client.clientId}_${props.month}_${props.year}.pdf`;
    const [sendInvoiceEmail, { isLoading: isSending }] =
        useSendInvoiceEmailMutation();

    const handleSendEmail = async () => {
        if (!props.client.email && !props.client.officeAddress) {
            toast.error('Client email not found');
            return;
        }

        // Use provided email or fallback to a placeholder/display error if crucial
        const clientEmail = props.client.email || '';
        if (!clientEmail) {
            toast.error('Client email is missing.');
            return;
        }

        try {
            const blob = await pdf(<InvoiceDocument {...props} />).toBlob();

            const formData = new FormData();
            formData.append('file', blob, fileName);
            formData.append('to', clientEmail);
            formData.append('clientName', props.client.name);
            formData.append('month', props.month);
            formData.append('year', props.year);

            const result = await sendInvoiceEmail(formData).unwrap();

            if (result.success) {
                toast.success('Invoice sent successfully to ' + clientEmail);
            } else {
                throw new Error(result.message || 'Failed to send email');
            }
        } catch (error: any) {
            console.error('Error sending email:', error);
            toast.error(
                error.data?.message || error.message || 'Failed to send email',
            );
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end gap-2">
                <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={isSending}
                    onClick={handleSendEmail}
                >
                    <Mail className="h-4 w-4 " />
                    {isSending ? 'Sending...' : 'Send to Client'}
                </Button>
                <PDFDownloadLink
                    document={<InvoiceDocument {...props} />}
                    fileName={fileName}
                >
                    {({ loading }) => (
                        <Button
                            className="bg-teal-500 hover:bg-teal-600"
                            disabled={loading || isSending}
                        >
                            <Download className="h-4 w-4 " />
                            {loading ? 'Generating PDF...' : 'Download PDF'}
                        </Button>
                    )}
                </PDFDownloadLink>
            </div>

            <div className="h-[600px] w-full border rounded-lg overflow-hidden bg-gray-100">
                <PDFViewer width="100%" height="100%" className="border-none">
                    <InvoiceDocument {...props} />
                </PDFViewer>
            </div>
        </div>
    );
}
