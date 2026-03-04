"use client";

import InvitationList from "@/components/admin/invitation-list";

export default function InvitationsPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">
                    Employee Invitations
                </h1>
                <p className="text-muted-foreground">
                    Invite new employees and manage pending invitations
                </p>
            </div>

            <InvitationList />
        </div>
    );
}
