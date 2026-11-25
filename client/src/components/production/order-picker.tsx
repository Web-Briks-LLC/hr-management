'use client';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from '@/components/ui/combobox';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useGetSanitizedOrdersQuery } from '@/redux/features/production/productionApi';
import type { ISanitizedProductionOrder } from '@/types/production.type';

export function OrderPicker({
    value,
    onChange,
    status,
    onStatusChange,
    includeCompleted = false,
    disabled = false,
}: {
    value: ISanitizedProductionOrder | null;
    onChange: (order: ISanitizedProductionOrder | null) => void;
    status: string;
    onStatusChange: (status: string) => void;
    includeCompleted?: boolean;
    disabled?: boolean;
}) {
    const {
        currentData: data,
        isLoading,
        isError,
        refetch,
    } = useGetSanitizedOrdersQuery({ status, includeCompleted });
    return (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="space-y-2">
                <Label htmlFor="production-status">Order status</Label>
                <Select
                    value={status}
                    onValueChange={onStatusChange}
                    disabled={disabled}
                >
                    <SelectTrigger id="production-status" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All active orders</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="quality_check">
                            Quality check
                        </SelectItem>
                        <SelectItem value="revision">Revision</SelectItem>
                        {includeCompleted && (
                            <SelectItem value="completed">Completed</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="production-order">Client ID or Order ID</Label>
                {isLoading ? (
                    <Skeleton className="h-9 w-full" />
                ) : isError ? (
                    <Button variant="outline" onClick={() => refetch()}>
                        We could not load the orders. Tap to try again
                    </Button>
                ) : (
                    <Combobox
                        items={data?.data || []}
                        value={value}
                        onValueChange={onChange}
                        itemToStringLabel={(order: ISanitizedProductionOrder) =>
                            `${order.clientId?.clientId || 'No client ID'} · ${order.orderName}`
                        }
                        isItemEqualToValue={(a, b) => a._id === b._id}
                        disabled={disabled}
                    >
                        <ComboboxInput
                            id="production-order"
                            placeholder="Search client or order…"
                            className="w-full"
                            disabled={disabled}
                            showClear
                        />
                        <ComboboxContent>
                            <ComboboxEmpty>No matching orders.</ComboboxEmpty>
                            <ComboboxList>
                                {(order: ISanitizedProductionOrder) => (
                                    <ComboboxItem key={order._id} value={order}>
                                        <div className="flex min-w-0 flex-col">
                                            <span className="font-medium">
                                                {order.clientId?.clientId ||
                                                    'No client ID'}{' '}
                                                · {order.orderName}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {order.imageQuantity} images ·{' '}
                                                {order.status.replaceAll(
                                                    '_',
                                                    ' ',
                                                )}
                                            </span>
                                        </div>
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                )}
            </div>
        </div>
    );
}
