'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { UploadCloud, SquarePenIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useUploadImageMutation } from '@/redux/features/user/userApi';
import { Spinner } from '../ui/spinner';
import { useSession } from '@/lib/auth-client';

export function ProfileImageUploadDialog() {
    const { refetch } = useSession();

    const [isOpen, setIsOpen] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [uploadImage, { isLoading }] = useUploadImageMutation();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
        },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024,
    });

    const handleUpload = async () => {
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('image', file);

            await uploadImage(formData).unwrap();

            toast.success('Profile image updated successfully.');

            refetch();
            setFile(null);
            setPreview(null);
            setIsOpen(false);
        } catch (error) {
            toast.error((error as Error).message || 'Something went wrong.');
        }
    };

    return (
        // 3. Connect the state to the Dialog component
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="absolute -top-16 right-0 group-hover/profile-image:top-0">
                    <SquarePenIcon className=" h-4 w-4" />
                    Update Image
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Profile Image</DialogTitle>
                    <DialogDescription>
                        Upload a new profile photo. JPG, PNG, WEBP up to 5MB.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4">
                    <div
                        {...getRootProps()}
                        className={cn(
                            'relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition',
                            isDragActive
                                ? 'border-primary bg-primary/10'
                                : 'border-muted-foreground/30',
                        )}
                    >
                        <Input {...getInputProps()} />

                        {!preview ? (
                            <>
                                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {isDragActive
                                        ? 'Drop the image here...'
                                        : 'Drag & drop image here or click to browse'}
                                </p>
                            </>
                        ) : (
                            <div className="relative h-full w-full">
                                <Image
                                    src={preview}
                                    alt="Preview"
                                    fill
                                    className="rounded-xl object-cover"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setPreview(null);
                                    }}
                                    className="absolute right-2 top-2"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            disabled={!file || isLoading}
                            onClick={handleUpload}
                        >
                            {isLoading ? <Spinner /> : 'Upload Image'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
