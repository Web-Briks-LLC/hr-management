"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/lib/auth-client";
import { useGetPendingPoliciesQuery } from "@/redux/features/policy/policyApi";
import { IPolicy } from "@/types/policy.type";
import { toast } from "sonner";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // We'll use this to trigger a refetch of pending policies when a new one is prompted
    const { refetch: refetchPending } = useGetPendingPoliciesQuery(undefined, {
        skip: !session?.user?.id,
    });

    useEffect(() => {
        if (session?.user?.id) {
            const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", {
                withCredentials: true,
            });

            socketInstance.on("connect", () => {
                setIsConnected(true);
                console.log("Socket connected:", socketInstance.id);
                socketInstance.emit("authenticate", session.user.id);
            });

            socketInstance.on("disconnect", () => {
                setIsConnected(false);
                console.log("Socket disconnected");
            });

            socketInstance.on("policy:prompt", (policy: IPolicy) => {
                console.log("New policy prompt received:", policy.title);
                toast.info(`New Policy: ${policy.title}`, {
                    description: "A new policy requires your attention.",
                });
                refetchPending();
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
            };
        }
    }, [session?.user?.id, refetchPending]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
