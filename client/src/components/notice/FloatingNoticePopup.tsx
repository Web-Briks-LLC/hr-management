'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Megaphone, X, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    useGetUnreadNoticesQuery,
    useMarkNoticeAsViewedMutation,
} from '@/redux/features/notice/noticeApi';
import type { INotice } from '@/types/notice.type';
import {
    NOTICE_PRIORITY_LABELS,
    NOTICE_CATEGORY_LABELS,
    NOTICE_PRIORITY_COLORS,
    NOTICE_CATEGORY_COLORS,
} from '@/types/notice.type';

export function FloatingNoticePopup() {
    const { data, isLoading } = useGetUnreadNoticesQuery();
    const [markAsViewed] = useMarkNoticeAsViewedMutation();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    const unreadNotices = data?.data || [];
    const visibleNotices = unreadNotices.filter((n) => !dismissedIds.has(n._id));
    const currentNotice = visibleNotices[currentIndex];

    useEffect(() => {
        if (visibleNotices.length > 0 && !isLoading) {
            setIsVisible(true);
        }
    }, [visibleNotices.length, isLoading]);

    const handleDismiss = async (notice: INotice) => {
        try {
            await markAsViewed(notice._id).unwrap();
        } catch (error) {
            console.error('Failed to mark as viewed:', error);
        }
        setDismissedIds((prev) => new Set([...prev, notice._id]));

        // Move to next if available
        if (currentIndex >= visibleNotices.length - 1) {
            setCurrentIndex(Math.max(0, visibleNotices.length - 2));
        }

        // Hide if no more notices
        if (visibleNotices.length <= 1) {
            setIsVisible(false);
        }
    };

    const handleDismissAll = async () => {
        for (const notice of visibleNotices) {
            try {
                await markAsViewed(notice._id).unwrap();
            } catch (error) {
                console.error('Failed to mark as viewed:', error);
            }
        }
        setIsVisible(false);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(visibleNotices.length - 1, prev + 1));
    };

    if (!isVisible || !currentNotice || visibleNotices.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg mx-4 bg-background border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-primary/5">
                    <div className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        <span className="font-semibold">New Notice</span>
                        {visibleNotices.length > 1 && (
                            <Badge variant="secondary" className="ml-2">
                                {currentIndex + 1} of {visibleNotices.length}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsVisible(false)}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-2 mb-3">
                        {currentNotice.isPinned && <Pin className="h-5 w-5 text-amber-500 shrink-0" />}
                        <h3 className="text-xl font-bold">{currentNotice.title}</h3>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
                        <Badge className={NOTICE_PRIORITY_COLORS[currentNotice.priority]} variant="outline">
                            {NOTICE_PRIORITY_LABELS[currentNotice.priority]}
                        </Badge>
                        <Badge className={NOTICE_CATEGORY_COLORS[currentNotice.category]} variant="outline">
                            {NOTICE_CATEGORY_LABELS[currentNotice.category]}
                        </Badge>
                    </div>

                    <div
                        className="prose prose-sm max-w-none dark:prose-invert max-h-60 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: currentNotice.content }}
                    />

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t">
                        <span>
                            {format(new Date(currentNotice.publishedAt || currentNotice.createdAt), 'MMM dd, yyyy hh:mm a')}
                        </span>
                        <span>By: {currentNotice.createdBy?.name}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                    <div className="flex gap-1">
                        {visibleNotices.length > 1 && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleNext}
                                    disabled={currentIndex === visibleNotices.length - 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {visibleNotices.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={handleDismissAll}>
                                Dismiss All
                            </Button>
                        )}
                        <Button size="sm" onClick={() => handleDismiss(currentNotice)}>
                            Got It
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
