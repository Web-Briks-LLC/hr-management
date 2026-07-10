import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { BellIcon, Check, CheckCheck, DotIcon } from 'lucide-react';

export default function Notification() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={'outline'}
                    size={'icon'}
                    className="rounded-full! relative"
                >
                    <DotIcon
                        className="absolute -top-1 left-1 w-9! h-9! text-destructive animate-caret-blink"
                        strokeWidth={3}
                    />
                    <BellIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full max-w-xs" align="end">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="text-[16px]!">Notifications</span>
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        className="text-[12px]!"
                    >
                        <CheckCheck size={20} />
                        Mark all as Read
                    </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-gray-500" />
                <DropdownMenuItem>
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[14px] font-medium text-clip">
                                Message title
                            </h3>
                            <Button
                                size={'sm'}
                                variant={'ghost'}
                                className="text-[12px]"
                            >
                                <Check size={20} />
                                Mark as Read
                            </Button>
                        </div>
                        <p className="text-ellipsis max-w-xs">
                            Lorem ipsum dolor sit amet consectetur adipisicing
                            elit. Obcaecati odit natus earum odio labore
                            explicabo.
                        </p>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
