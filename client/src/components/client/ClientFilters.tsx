import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CLIENT_STATUS_OPTIONS, PER_PAGE_OPTIONS } from "@/lib/constants";

interface ClientFiltersProps {
    search: string;
    status: string;
    limit: number;
    onFilterChange: (key: string, value: string | number) => void;
    onClearFilters: () => void;
}

export function ClientFilters({
    search,
    status,
    limit,
    onFilterChange,
    onClearFilters,
}: ClientFiltersProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            <Input
                placeholder="Search by name, email, or ID..."
                value={search}
                onChange={(e) => onFilterChange("search", e.target.value)}
                className="w-full"
            />
            <Select
                value={status}
                onValueChange={(value) => onFilterChange("status", value)}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                    {CLIENT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select
                value={limit.toString()}
                onValueChange={(value) => onFilterChange("limit", parseInt(value))}
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PER_PAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt.toString()}>
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={onClearFilters}>
                Clear Filters
            </Button>
        </div>
    );
}
