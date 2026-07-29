'use client';
import * as React from 'react';
import { NavMain } from '@/components/sidebar/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="h-(--header-height) flex items-center justify-center border-b border-sidebar-border/40 px-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="w-auto h-auto mx-auto hover:bg-transparent focus-visible:ring-0"
                        >
                            <Link href="/">
                                <figure className="w-auto h-auto flex items-center justify-center">
                                    <Image
                                        src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png"
                                        alt="Company logo"
                                        width={150}
                                        height={45}
                                        loading="eager"
                                        className="transition-transform duration-300 hover:scale-102"
                                        style={{ width: 'auto', height: 'auto', maxWidth: '140px' }}
                                    />
                                </figure>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="py-2">
                <NavMain />
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
}

