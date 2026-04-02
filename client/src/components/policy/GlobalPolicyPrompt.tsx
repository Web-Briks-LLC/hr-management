"use client";

import React, { useState, useEffect } from "react";
import { useGetPendingPoliciesQuery, useAcceptPolicyMutation } from "@/redux/features/policy/policyApi";
import { useSession } from "@/lib/auth-client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader } from "lucide-react";
import { toast } from "sonner";

export function GlobalPolicyPrompt() {
    const { data: session } = useSession();
    const { data, isLoading } = useGetPendingPoliciesQuery(undefined, {
        skip: !session?.user?.id,
    });
    const [acceptPolicy, { isLoading: isAccepting }] = useAcceptPolicyMutation();
    
    const [currentPolicyIndex, setCurrentPolicyIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const pendingPolicies = data?.policies || [];
    const currentPolicy = pendingPolicies[currentPolicyIndex];

    useEffect(() => {
        if (pendingPolicies.length > 0) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [pendingPolicies]);

    const handleAccept = async () => {
        if (!currentPolicy) return;
        
        try {
            await acceptPolicy(currentPolicy._id).unwrap();
            toast.success("Policy accepted");
            
            if (currentPolicyIndex < pendingPolicies.length - 1) {
                setCurrentPolicyIndex(prev => prev + 1);
            } else {
                setIsOpen(false);
                setCurrentPolicyIndex(0);
            }
        } catch (error) {
            toast.error("Failed to accept policy");
            console.error(error);
        }
    };

    if (isLoading || pendingPolicies.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            // Prevent closing if acceptance is required
            if (currentPolicy?.requiresAcceptance) return;
            setIsOpen(open);
        }}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
                <div className="p-6 overflow-hidden flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{currentPolicy?.title}</DialogTitle>
                        <DialogDescription>
                            Please review and accept the following policy.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 pr-4">
                        <div 
                            className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: currentPolicy?.description || "" }} 
                        />
                    </ScrollArea>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button 
                            onClick={handleAccept} 
                            disabled={isAccepting}
                            className="min-w-[120px]"
                        >
                            {isAccepting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                            I Agree & Accept
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
