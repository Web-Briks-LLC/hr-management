'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Megaphone, Pin, Pencil, Trash2, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useGetAllNoticesQuery,
    useCreateNoticeMutation,
    useUpdateNoticeMutation,
    usePublishNoticeMutation,
    useUnpublishNoticeMutation,
    useDeleteNoticeMutation,
    useGetNoticeStatsQuery,
} from '@/redux/features/notice/noticeApi';
import type { INotice, NoticeCategory, NoticePriority, CreateNoticeInput } from '@/types/notice.type';
import {
    NOTICE_PRIORITY_LABELS,
    NOTICE_CATEGORY_LABELS,
    NOTICE_PRIORITY_COLORS,
    NOTICE_CATEGORY_COLORS,
} from '@/types/notice.type';

export default function NoticeManagePage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<INotice | null>(null);
    const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null);
    const [statsNoticeId, setStatsNoticeId] = useState<string | null>(null);

    const { data, isLoading } = useGetAllNoticesQuery();
    const [createNotice, { isLoading: isCreating }] = useCreateNoticeMutation();
    const [updateNotice, { isLoading: isUpdating }] = useUpdateNoticeMutation();
    const [publishNotice] = usePublishNoticeMutation();
    const [unpublishNotice] = useUnpublishNoticeMutation();
    const [deleteNotice] = useDeleteNoticeMutation();

    const notices = data?.data || [];

    const handleCreate = async (formData: CreateNoticeInput) => {
        try {
            await createNotice(formData).unwrap();
            toast.success('Notice created successfully');
            setIsCreateOpen(false);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create notice');
        }
    };

    const handleUpdate = async (id: string, formData: CreateNoticeInput) => {
        try {
            await updateNotice({ id, ...formData }).unwrap();
            toast.success('Notice updated successfully');
            setEditingNotice(null);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update notice');
        }
    };

    const handlePublishToggle = async (notice: INotice) => {
        try {
            if (notice.isPublished) {
                await unpublishNotice(notice._id).unwrap();
                toast.success('Notice unpublished');
            } else {
                await publishNotice(notice._id).unwrap();
                toast.success('Notice published and notifications sent!');
            }
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update publish status');
        }
    };

    const handleDelete = async () => {
        if (!deleteNoticeId) return;
        try {
            await deleteNotice(deleteNoticeId).unwrap();
            toast.success('Notice deleted');
            setDeleteNoticeId(null);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to delete notice');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Megaphone className="h-6 w-6" />
                        Notice Management
                    </h1>
                    <p className="text-muted-foreground">Create and manage company notices</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Notice
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Create New Notice</DialogTitle>
                            <DialogDescription>
                                Create a notice. You can publish it later to notify all users.
                            </DialogDescription>
                        </DialogHeader>
                        <NoticeForm onSubmit={handleCreate} isLoading={isCreating} />
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            ) : notices.length === 0 ? (
                <Card className="p-12 text-center">
                    <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No notices yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Create your first notice to get started
                    </p>
                </Card>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notices.map((notice) => (
                                <TableRow key={notice._id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {notice.isPinned && <Pin className="h-4 w-4 text-amber-500" />}
                                            <span className="font-medium">{notice.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={NOTICE_CATEGORY_COLORS[notice.category]} variant="outline">
                                            {NOTICE_CATEGORY_LABELS[notice.category]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={NOTICE_PRIORITY_COLORS[notice.priority]} variant="outline">
                                            {NOTICE_PRIORITY_LABELS[notice.priority]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={notice.isPublished ? 'default' : 'secondary'}>
                                            {notice.isPublished ? 'Published' : 'Draft'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(notice.createdAt), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handlePublishToggle(notice)}
                                                title={notice.isPublished ? 'Unpublish' : 'Publish'}
                                            >
                                                {notice.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setStatsNoticeId(notice._id)}
                                                title="View Stats"
                                            >
                                                <BarChart3 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingNotice(notice)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setDeleteNoticeId(notice._id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Edit Dialog */}
            {editingNotice && (
                <Dialog open={!!editingNotice} onOpenChange={(open) => !open && setEditingNotice(null)}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Edit Notice</DialogTitle>
                        </DialogHeader>
                        <NoticeForm
                            initialData={editingNotice}
                            onSubmit={(data) => handleUpdate(editingNotice._id, data)}
                            isLoading={isUpdating}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteNoticeId} onOpenChange={(open) => !open && setDeleteNoticeId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Notice?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Stats Dialog */}
            {statsNoticeId && (
                <NoticeStatsDialog
                    noticeId={statsNoticeId}
                    onClose={() => setStatsNoticeId(null)}
                />
            )}
        </div>
    );
}

// Notice Form Component
function NoticeForm({
    initialData,
    onSubmit,
    isLoading,
}: {
    initialData?: INotice;
    onSubmit: (data: CreateNoticeInput) => void;
    isLoading: boolean;
}) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [priority, setPriority] = useState<NoticePriority>(initialData?.priority || 'medium');
    const [category, setCategory] = useState<NoticeCategory>(initialData?.category || 'general');
    const [isPinned, setIsPinned] = useState(initialData?.isPinned || false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ title, content, priority, category, isPinned });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Title</Label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Notice title"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as NoticeCategory)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(NOTICE_CATEGORY_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(NOTICE_PRIORITY_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Notice content..."
                    rows={6}
                    required
                />
            </div>

            <div className="flex items-center space-x-2">
                <Switch id="pinned" checked={isPinned} onCheckedChange={setIsPinned} />
                <Label htmlFor="pinned">Pin this notice (stays at top)</Label>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Saving...' : initialData ? 'Update Notice' : 'Create Notice'}
            </Button>
        </form>
    );
}

// Stats Dialog Component
function NoticeStatsDialog({ noticeId, onClose }: { noticeId: string; onClose: () => void }) {
    const { data, isLoading } = useGetNoticeStatsQuery(noticeId);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Notice Statistics</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                ) : (
                    <div className="space-y-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-3xl font-bold">{data?.data.totalViews || 0}</p>
                            <p className="text-muted-foreground text-sm">Total Views</p>
                        </div>
                        {data?.data.viewedBy && data.data.viewedBy.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">Viewed By</h4>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {data.data.viewedBy.map((user) => (
                                        <div key={user._id} className="text-sm p-2 bg-muted/50 rounded">
                                            {user.name} <span className="text-muted-foreground">({user.email})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
