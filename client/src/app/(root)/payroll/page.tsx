import { Metadata } from 'next';
import PayrollClient from './payroll-client';

export const metadata: Metadata = {
    title: 'Payroll | HR Management - Web Briks LLC',
    description:
        'Manage monthly salaries, attendance corrections, and payments.',
};

export default function PayrollPage() {
    return <PayrollClient />;
}
