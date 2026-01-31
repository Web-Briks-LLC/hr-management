import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Expense } from '@/redux/features/expense/expenseApi';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#112233',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        textAlign: 'left',
        color: '#112233',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
    },
    companyName: {
        fontSize: 14,
        color: '#112233',
        marginTop: 5,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#bfbfbf',
        marginTop: 20,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '16%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#bfbfbf',
        backgroundColor: '#f0f0f0',
        padding: 5,
    },
    tableCol: {
        width: '16%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#bfbfbf',
        padding: 5,
    },
    tableColWide: {
        width: '20%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#bfbfbf',
        padding: 5,
    },
    tableCellHeader: {
        margin: 'auto',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
    },
    tableCell: {
        margin: 'auto',
        fontSize: 10,
        color: '#333',
    },
    tableCellAmount: {
        margin: 'auto',
        fontSize: 10,
        color: '#333',
        textAlign: 'right',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 10,
        color: '#aaa',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    summarySection: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    summaryBox: {
        width: '40%',
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#666',
    },
    summaryValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#112233',
    },
});

interface ExpenseReportPDFProps {
    expenses: Expense[];
    filters: any;
    totalAmount: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 2,
    }).format(amount);
};

export const ExpenseReportPDF = ({
    expenses,
    filters,
    totalAmount,
}: ExpenseReportPDFProps) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Expense Report</Text>
                    <Text style={styles.subtitle}>
                        Generated on {format(new Date(), 'PPP')}
                    </Text>
                    {filters.startDate && filters.endDate && (
                        <Text style={styles.subtitle}>
                            Period: {filters.startDate} to {filters.endDate}
                        </Text>
                    )}
                    {(filters.month || filters.year) && !filters.startDate && (
                        <Text style={styles.subtitle}>
                            Period: {filters.month}/{filters.year}
                        </Text>
                    )}
                    <Text style={styles.companyName}>Web Briks LLC</Text>
                </View>

                {/* Table Header */}
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColHeader}>
                            <Text style={styles.tableCellHeader}>Date</Text>
                        </View>
                        <View style={styles.tableColWide}>
                            <Text style={styles.tableCellHeader}>Title</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCellHeader}>Category</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCellHeader}>Branch</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCellHeader}>Status</Text>
                        </View>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCellHeader}>
                                Amount (BDT)
                            </Text>
                        </View>
                    </View>

                    {/* Table Rows */}
                    {expenses.map((expense) => (
                        <View style={styles.tableRow} key={expense._id}>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>
                                    {format(
                                        new Date(expense.date),
                                        'dd MMM yyyy',
                                    )}
                                </Text>
                            </View>
                            <View style={styles.tableColWide}>
                                <Text style={styles.tableCell}>
                                    {expense.title}
                                </Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>
                                    {expense.category?.name || 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>
                                    {expense.branch?.name || 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCell}>
                                    {expense.status
                                        .replace('_', ' ')
                                        .toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.tableCol}>
                                <Text style={styles.tableCellAmount}>
                                    {formatCurrency(expense.amount)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>
                                Total Expenses:
                            </Text>
                            <Text style={styles.summaryValue}>
                                {expenses.length}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>
                                Total Amount:
                            </Text>
                            <Text style={styles.summaryValue}>
                                BDT {formatCurrency(totalAmount)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>
                        This is a system generated report. 1209 Mountain Road PL
                        NE, STE R, Albuquerque, NM 87110, US
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
