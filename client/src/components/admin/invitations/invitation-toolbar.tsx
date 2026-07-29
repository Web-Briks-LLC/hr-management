'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import type { StatusFilterType } from './types';

interface InvitationToolbarProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    statusFilter: StatusFilterType;
    onStatusFilterChange: (val: StatusFilterType) => void;
    onReset: () => void;
    isFiltered: boolean;
}

export function InvitationToolbar({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    onReset,
    isFiltered,
}: InvitationToolbarProps) {
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
                    placeholder="Search by email, designation, or role..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 pr-8 h-9 bg-background/60 border-input text-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
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
                value={statusFilter}
                onValueChange={(val) => onStatusFilterChange(val as StatusFilterType)}
            >
                <SelectTrigger className="w-[150px] h-9 bg-background/60 text-xs font-medium">
                    <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="accepted" className="text-xs">Accepted</SelectItem>
                    <SelectItem value="expired" className="text-xs">Expired</SelectItem>
                </SelectContent>
            </Select>

            {isFiltered && (
                <Button
                    variant="ghost"
                    onClick={onReset}
                    className="h-9 px-3 text-xs gap-1.5 hover:bg-muted/85 font-medium shrink-0"
                >
                    Reset Filters
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}
