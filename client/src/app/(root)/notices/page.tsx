'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Megaphone, Pin, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGetPublishedNoticesQuery, useMarkNoticeAsViewedMutation } from '@/redux/features/notice/noticeApi';
import type { INotice, NoticeCategory } from '@/types/notice.type';
import {
    NOTICE_PRIORITY_LABELS,
    NOTICE_CATEGORY_LABELS,
    NOTICE_PRIORITY_COLORS,
    NOTICE_CATEGORY_COLORS,
} from '@/types/notice.type';

export default function NoticesPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedNotice, setSelectedNotice] = useState<INotice | null>(null);

    const { data, isLoading } = useGetPublishedNoticesQuery(
        selectedCategory !== 'all' ? { category: selectedCategory as NoticeCategory } : undefined
    );
    const [markAsViewed] = useMarkNoticeAsViewedMutation();

    const notices = data?.data || [];

    const handleNoticeClick = async (notice: INotice) => {
        setSelectedNotice(notice);
        try {
            await markAsViewed(notice._id).unwrap();
        } catch (error) {
            console.error('Failed to mark as viewed:', error);
        }
    };

    const categories = ['all', 'general', 'policy', 'event', 'holiday', 'maintenance', 'other'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Megaphone className="h-6 w-6" />
                        Notice Board
                    </h1>
                    <p className="text-muted-foreground">Stay updated with company announcements</p>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : NOTICE_CATEGORY_LABELS[cat as NoticeCategory]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : notices.length === 0 ? (
                <Card className="p-12 text-center">
                    <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No notices yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Check back later for company announcements
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {notices.map((notice) => (
                        <Card
                            key={notice._id}
                            className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 ${notice.isPinned ? 'border-amber-300 bg-amber-50/20' : ''
                                }`}
                            onClick={() => handleNoticeClick(notice)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                                        {notice.isPinned && <Pin className="h-4 w-4 text-amber-500 shrink-0" />}
                                        {notice.title}
                                    </CardTitle>
                                </div>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    <Badge className={NOTICE_PRIORITY_COLORS[notice.priority]} variant="outline">
                                        {NOTICE_PRIORITY_LABELS[notice.priority]}
                                    </Badge>
                                    <Badge className={NOTICE_CATEGORY_COLORS[notice.category]} variant="outline">
                                        {NOTICE_CATEGORY_LABELS[notice.category]}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm line-clamp-3">
                                    {notice.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(notice.publishedAt || notice.createdAt), 'MMM dd, yyyy')}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Notice Detail Modal */}
            <Dialog open={!!selectedNotice} onOpenChange={(open) => !open && setSelectedNotice(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    {selectedNotice && (
                        <>
                            <DialogHeader>
                                <div className="flex items-start gap-2">
                                    {selectedNotice.isPinned && <Pin className="h-5 w-5 text-amber-500 shrink-0 mt-1" />}
                                    <DialogTitle className="text-xl">{selectedNotice.title}</DialogTitle>
                                </div>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    <Badge className={NOTICE_PRIORITY_COLORS[selectedNotice.priority]} variant="outline">
                                        {NOTICE_PRIORITY_LABELS[selectedNotice.priority]}
                                    </Badge>
                                    <Badge className={NOTICE_CATEGORY_COLORS[selectedNotice.category]} variant="outline">
                                        {NOTICE_CATEGORY_LABELS[selectedNotice.category]}
                                    </Badge>
                                </div>
                            </DialogHeader>
                            <div className="mt-4">
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
                                />
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-6 pt-4 border-t">
                                    <span>
                                        Published: {format(new Date(selectedNotice.publishedAt || selectedNotice.createdAt), 'MMM dd, yyyy hh:mm a')}
                                    </span>
                                    <span>By: {selectedNotice.createdBy?.name}</span>
                                </div>
                                {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium mb-2">Attachments</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedNotice.attachments.map((att, idx) => (
                                                <Button key={idx} variant="outline" size="sm" asChild>
                                                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                        {att.fileName}
                                                    </a>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
