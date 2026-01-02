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
} from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="w-auto h-auto mx-auto hover:bg-transparent"
                        >
                            <Link href="/">
                                <figure className="w-auto h-auto">
                                    <Image
                                        src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png"
                                        alt="Company logo"
                                        width={150}
                                        height={45}
                                        loading="eager"
                                        style={{ width: 'auto', height: 'auto', maxWidth: '150px' }}
                                    />
                                </figure>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain />
            </SidebarContent>
        </Sidebar>
    );
}
