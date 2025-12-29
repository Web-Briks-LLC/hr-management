'use client';

import InvitationList from '@/components/admin/invitation-list';
import MetadataSettings from '@/components/admin/metadata-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Settings, Users } from 'lucide-react';

export default function InvitationsPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Employee Invitations</h1>
                <p className="text-muted-foreground">
                    Invite new employees and manage pending invitations
                </p>
            </div>

            <Tabs defaultValue="invitations" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="invitations" className="gap-2">
                        <Users className="h-4 w-4" />
                        Invitations
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="invitations" className="mt-6">
                    <InvitationList />
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                    <MetadataSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
