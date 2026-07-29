'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut, updateUser, useSession } from '@/lib/auth-client';
import {
    EllipsisVertical,
    Loader,
    LogOut,
    UserCircle,
    UserIcon,
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { IconMoonStars, IconSun } from '@tabler/icons-react';
import { Button } from '../ui/button';

export function NavUser() {
    const { theme, setTheme, systemTheme } = useTheme();
    const { data, isPending } = useSession();
    const [signingOut, setSigningOut] = useState(false);
    const router = useRouter();
    const isLoading = isPending;

    const handleSignout = async () => {
        if (signingOut) return;

        try {
            setSigningOut(true);

            const res = await signOut();

            if (res.data?.success) {
                toast.success('Signed out successfully.');
                router.push('/sign-in');
            } else {
                toast.error(
                    res.error?.message || 'Failed to signout. Try again later.'
                );
            }
        } catch (error) {
            toast.error((error as Error).message || 'Something went wrong.');
        } finally {
            setSigningOut(false);
        }
    };

    const handleChangeTheme = async () => {
        const currentTheme = theme === 'system' ? systemTheme : theme;
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

        try {
            setTheme(nextTheme);

            await updateUser({
                theme: nextTheme,
            });

            toast.success(`Theme changed to ${nextTheme}`);
        } catch (error) {
            toast.error('Failed to update theme');
            console.error(error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="lg"
                    variant={'ghost'}
                    className="outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 px-0!"
                >
                    <Avatar className="h-8 w-8 rounded-full">
                        <AvatarImage
                            src={data?.user.image || undefined}
                            alt={data?.user.name}
                        />
                        <AvatarFallback className="rounded-lg">
                            {isLoading ? (
                                <Skeleton className="h-full w-full" />
                            ) : (
                                data?.user.name?.charAt(0) ?? (
                                    <UserIcon className="size-4" />
                                )
                            )}
                        </AvatarFallback>
                    </Avatar>
                    <div
                        className={cn(
                            'grid flex-1 text-left text-sm leading-tight',
                            isLoading && 'gap-1'
                        )}
                    >
                        <span className="truncate font-medium">
                            {isLoading ? (
                                <Skeleton className="h-[16px] w-52" />
                            ) : (
                                data?.user.name
                            )}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                            {isLoading ? (
                                <Skeleton className="h-[12px] w-52" />
                            ) : (
                                data?.user.email
                            )}
                        </span>
                    </div>
                    <EllipsisVertical className="ml-auto size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                side={'bottom'}
                align="end"
                sideOffset={4}
            >
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-full">
                            <AvatarImage
                                src={data?.user.image || undefined}
                                alt={data?.user.name}
                            />
                            <AvatarFallback className="rounded-lg">
                                {isLoading ? (
                                    <Skeleton className="h-full w-full" />
                                ) : (
                                    data?.user.name?.charAt(0) ?? (
                                        <UserIcon className="size-4" />
                                    )
                                )}
                            </AvatarFallback>
                        </Avatar>
                        <div
                            className={cn(
                                'grid flex-1 text-left text-sm leading-tight',
                                isLoading && 'gap-1'
                            )}
                        >
                            <span className="truncate font-medium">
                                {isLoading ? (
                                    <Skeleton className="h-[16px] w-52" />
                                ) : (
                                    data?.user.name
                                )}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                                {isLoading ? (
                                    <Skeleton className="h-[12px] w-52" />
                                ) : (
                                    data?.user.email
                                )}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href={'/account'}>
                            <UserCircle />
                            Account
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleChangeTheme}>
                        {theme !== 'dark' ? <IconMoonStars /> : <IconSun />}
                        Toggle Mode ({theme !== 'dark' ? 'Light' : 'Dark'})
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="bg-red-100 hover:bg-red-200 transition-all duration-200 cursor-pointer dark:hover:bg-destructive dark:bg-transparent ease-in"
                    onClick={handleSignout}
                    disabled={signingOut}
                >
                    {signingOut ? (
                        <Loader className="animate-spin" />
                    ) : (
                        <LogOut className="text-destructive dark:text-white" />
                    )}
                    <span className="text-destructive dark:text-white">
                        Log out
                    </span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
