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
            <SidebarHeader className="flex items-center justify-center py-5 px-4">
                <Link href="/" className="flex items-center justify-center w-full focus:outline-hidden">
                    <figure className="flex items-center justify-center w-full">
                        <Image
                            src="https://res.cloudinary.com/dny7zfbg9/image/upload/v1755954483/mqontecf1xao7znsh6cx.png"
                            alt="Company logo"
                            width={180}
                            height={55}
                            priority
                            className="transition-transform duration-300 hover:scale-105 mx-auto object-contain"
                            style={{ width: 'auto', height: 'auto', maxHeight: '52px', maxWidth: '175px' }}
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
