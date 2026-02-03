import { Metadata } from 'next';
import PayrollClient from './payroll-client';

export const metadata: Metadata = {
    title: 'Payroll Management ',
    description:
        'Manage monthly salaries, attendance corrections, and payments.',
};

export default function PayrollPage() {
    return <PayrollClient />;
}
