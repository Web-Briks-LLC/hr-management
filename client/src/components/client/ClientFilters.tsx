import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { CLIENT_STATUS_OPTIONS } from "@/lib/constants";

interface ClientFiltersProps {
    search: string;
    status: string;
    onFilterChange: (key: string, value: string | number) => void;
    onClearFilters: () => void;
}

export function ClientFilters({
    search,
    status,
    onFilterChange,
    onClearFilters,
}: ClientFiltersProps) {
    const isFiltered = search !== "" || status !== "";

    return (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 shrink-0">
                <div className="bg-primary/10 p-2 rounded-full">
                    <Filter className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Filters:</span>
            </div>

            {/* Search Input consuming available width */}
            <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, email, or ID..."
                    value={search}
                    onChange={(e) => onFilterChange("search", e.target.value)}
                    className="pl-9 pr-8 h-9 bg-background/60 border-input text-sm"
                />
                {search && (
                    <button
                        onClick={() => onFilterChange("search", "")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                        type="button"
                        aria-label="Clear search"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Status Filter */}
            <Select
                value={status}
                onValueChange={(value) => onFilterChange("status", value)}
            >
                <SelectTrigger className="w-[150px] h-9 bg-background/60 text-xs font-medium">
                    <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                    {CLIENT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isFiltered && (
                <Button
                    variant="ghost"
                    onClick={onClearFilters}
                    className="h-9 px-3 text-xs hover:bg-muted/85 font-medium shrink-0"
                >
                    Clear Filters
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}
