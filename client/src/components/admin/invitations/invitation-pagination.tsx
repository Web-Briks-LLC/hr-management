'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface InvitationPaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    startIndex: number;
    totalItems: number;
}

export function InvitationPagination({
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
    startIndex,
    totalItems,
}: InvitationPaginationProps) {
    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
            {/* Left side: range info */}
            <div className="text-sm text-muted-foreground font-medium select-none">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-foreground">
                    {Math.min(startIndex + pageSize, totalItems)}
                </span>{' '}
                of <span className="font-semibold text-foreground">{totalItems}</span> invitations
            </div>

            {/* Right side: controls */}
            <div className="flex items-center gap-6">
                {/* Page Size Select */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(val) => onPageSizeChange(Number(val))}
                    >
                        <SelectTrigger className="h-8 w-[70px] text-xs font-semibold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5" className="text-xs">5</SelectItem>
                            <SelectItem value="10" className="text-xs">10</SelectItem>
                            <SelectItem value="20" className="text-xs">20</SelectItem>
                            <SelectItem value="50" className="text-xs">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Page Navigation Controls */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        aria-label="First page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-xs font-medium px-2 whitespace-nowrap select-none">
                        Page {currentPage} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        aria-label="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
