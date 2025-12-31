import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DebitTable() {
    const { stats, loading } = useSelector((state: RootState) => state.debit);

    if (loading && stats.length === 0) {
        return <div>Loading stats...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Debit Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Person</TableHead>
                            <TableHead className="text-right">Total Borrowed</TableHead>
                            <TableHead className="text-right">Total Returned</TableHead>
                            <TableHead className="text-right">Net Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                    No records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            stats.map((stat) => (
                                <TableRow key={stat._id}>
                                    <TableCell className="font-medium">{stat.name}</TableCell>
                                    <TableCell className="text-right">
                                        {stat.totalBorrowed.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {stat.totalReturned.toFixed(2)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right ${stat.netBalance > 0 ? 'text-red-500 font-bold' : 'text-green-500'
                                            }`}
                                    >
                                        {stat.netBalance.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
