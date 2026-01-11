"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Save, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useGetMonthlySummaryQuery, useCreateEarningMutation } from "@/redux/features/earning/earningApi";
import {
  useGetCurrencyRatesQuery,
  useUpdateCurrencyRatesMutation,
} from "@/redux/features/currencyRate/currencyRateApi";
import type { ClientMonthlySummary, CurrencyRate } from "@/types/currency-rate.type";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function MonthlySummaryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Currency rates state for editing
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});

  // Withdraw dialog state
  const [withdrawDialog, setWithdrawDialog] = useState<{
    open: boolean;
    client: ClientMonthlySummary | null;
  }>({ open: false, client: null });
  const [withdrawFees, setWithdrawFees] = useState(0);
  const [withdrawTax, setWithdrawTax] = useState(0);

  // API queries
  const { data: summaryData, isLoading: isLoadingSummary, refetch: refetchSummary } =
    useGetMonthlySummaryQuery({ month: selectedMonth, year: selectedYear });

  const { data: ratesData, isLoading: isLoadingRates } = useGetCurrencyRatesQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const [updateRates, { isLoading: isUpdatingRates }] = useUpdateCurrencyRatesMutation();
  const [createEarning, { isLoading: isCreatingEarning }] = useCreateEarningMutation();

  // Build rates map
  const ratesMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (ratesData?.data?.rates) {
      ratesData.data.rates.forEach((r) => {
        map[r.currency] = r.rate;
      });
    }
    return map;
  }, [ratesData]);

  // Get effective rate (edited or original)
  const getRate = (currency: string): number => {
    if (editedRates[currency] !== undefined) {
      return editedRates[currency];
    }
    return ratesMap[currency] || 120; // Default to 120 if not found
  };

  // Calculate estimated BDT for a client
  const getEstimatedBDT = (client: ClientMonthlySummary): number => {
    const rate = getRate(client.currency || "USD");
    return client.totalAmount * rate;
  };

  // Handle rate change
  const handleRateChange = (currency: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedRates((prev) => ({ ...prev, [currency]: numValue }));
  };

  // Save rates
  const handleSaveRates = async () => {
    try {
      const allRates: CurrencyRate[] = summaryData?.currencies?.map((currency) => ({
        currency,
        rate: getRate(currency),
      })) || [];

      await updateRates({
        month: selectedMonth,
        year: selectedYear,
        data: { rates: allRates },
      }).unwrap();

      toast.success("Currency rates saved successfully");
      setEditedRates({});
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save rates");
    }
  };

  // Open withdraw dialog
  const handleWithdraw = (client: ClientMonthlySummary) => {
    setWithdrawDialog({ open: true, client });
    setWithdrawFees(0);
    setWithdrawTax(0);
  };

  // Confirm withdraw
  const handleConfirmWithdraw = async () => {
    if (!withdrawDialog.client) return;

    const client = withdrawDialog.client;
    const rate = getRate(client.currency || "USD");

    try {
      await createEarning({
        clientId: client.clientId,
        orderIds: client.orders.map((o) => o._id),
        month: selectedMonth,
        year: selectedYear,
        totalOrderAmount: client.totalAmount,
        fees: withdrawFees,
        tax: withdrawTax,
        currency: client.currency || "USD",
        conversionRate: rate,
      }).unwrap();

      toast.success("Withdrawal recorded successfully!");
      setWithdrawDialog({ open: false, client: null });
      refetchSummary();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to record withdrawal");
    }
  };

  // Generate years (last 5 years)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const clients = summaryData?.data || [];
  const currencies = summaryData?.currencies || [];

  // Calculate totals
  const totalBDT = clients.reduce((sum, c) => sum + getEstimatedBDT(c), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Monthly Earnings Summary</h1>
          <p className="text-muted-foreground">
            View client-wise deliveries and manage withdrawals
          </p>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Total Est. BDT: ৳{totalBDT.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency Rates (Super Admin Only) */}
      {isSuperAdmin && currencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Currency Rates</CardTitle>
            <CardDescription>
              Set BDT conversion rates for this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              {currencies.map((currency) => (
                <div key={currency} className="space-y-2">
                  <Label>{currency} → BDT</Label>
                  <Input
                    type="number"
                    value={getRate(currency)}
                    onChange={(e) => handleRateChange(currency, e.target.value)}
                    className="w-[120px]"
                    min={0}
                    step={0.01}
                  />
                </div>
              ))}
              <Button
                onClick={handleSaveRates}
                disabled={isUpdatingRates || Object.keys(editedRates).length === 0}
              >
                {isUpdatingRates ? <Spinner /> : <Save className="h-4 w-4 mr-2" />}
                Save Rates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients - Pending Withdrawals</CardTitle>
          <CardDescription>
            Delivered orders not yet withdrawn for {MONTHS[selectedMonth - 1]?.label} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSummary || isLoadingRates ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending withdrawals for this month
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Est. BDT</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.clientId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.clientName}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.clientCode}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{client.orderCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {client.currency || "USD"} {client.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ৳{getEstimatedBDT(client).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => handleWithdraw(client)}
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        Withdraw
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog
        open={withdrawDialog.open}
        onOpenChange={(open) => setWithdrawDialog({ open, client: withdrawDialog.client })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Withdrawal</DialogTitle>
            <DialogDescription>
              Create earning record for {withdrawDialog.client?.clientName}
            </DialogDescription>
          </DialogHeader>

          {withdrawDialog.client && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <p className="font-medium">{withdrawDialog.client.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Orders:</span>
                  <p className="font-medium">{withdrawDialog.client.orderCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="font-medium">
                    {withdrawDialog.client.currency || "USD"}{" "}
                    {withdrawDialog.client.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rate:</span>
                  <p className="font-medium">
                    {getRate(withdrawDialog.client.currency || "USD")} BDT
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fees</Label>
                  <Input
                    type="number"
                    value={withdrawFees}
                    onChange={(e) => setWithdrawFees(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax</Label>
                  <Input
                    type="number"
                    value={withdrawTax}
                    onChange={(e) => setWithdrawTax(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Gross Amount:</span>
                  <span>
                    {withdrawDialog.client.currency || "USD"}{" "}
                    {withdrawDialog.client.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>- Fees:</span>
                  <span>{withdrawFees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>- Tax:</span>
                  <span>{withdrawTax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Net Amount:</span>
                  <span>
                    {(withdrawDialog.client.totalAmount - withdrawFees - withdrawTax).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-green-600">
                  <span>BDT Amount:</span>
                  <span>
                    ৳
                    {(
                      (withdrawDialog.client.totalAmount - withdrawFees - withdrawTax) *
                      getRate(withdrawDialog.client.currency || "USD")
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawDialog({ open: false, client: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmWithdraw} disabled={isCreatingEarning}>
              {isCreatingEarning ? <Spinner /> : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
