'use client';
import * as React from 'react';
import { NavMain } from '@/components/sidebar/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
            <SidebarHeader className="flex items-center justify-start py-4 px-3">
                <Link href="/" className="flex items-center justify-start focus:outline-hidden">
                    <figure className="flex items-center justify-start">
                        <Image
                            src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1777996436/q83auvamwih8u8ftw5zu.png"
                            alt="Company logo"
                            width={170}
                            height={50}
                            priority
                            className="object-contain"
                            style={{ width: 'auto', height: 'auto', maxHeight: '48px', maxWidth: '170px' }}
                        />
                    </figure>
                </Link>
            </SidebarHeader>
            <SidebarContent className="py-2">
                <NavMain />
            </SidebarContent>
        </Sidebar>
    );
}
