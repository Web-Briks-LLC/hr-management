"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { LaptopIcon, SmartphoneIcon, MonitorSmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useSession } from "@/lib/auth-client";

type SessionRow = {
    id: string;
    token: string;
    createdAt: Date | string;
    expiresAt: Date | string;
    ipAddress?: string | null;
    userAgent?: string | null;
};

function describeDevice(ua?: string | null) {
    if (!ua) return { name: "Unknown device", mobile: false };
    const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
    const os = /Windows/i.test(ua)
        ? "Windows"
        : /Android/i.test(ua)
          ? "Android"
          : /iPhone|iPad|iOS/i.test(ua)
            ? "iOS"
            : /Mac OS/i.test(ua)
              ? "macOS"
              : /Linux/i.test(ua)
                ? "Linux"
                : "Unknown OS";
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Firefox\//.test(ua)
              ? "Firefox"
              : /Safari\//.test(ua)
                ? "Safari"
                : "Browser";
    return { name: `${browser} on ${os}`, mobile };
}

/** Lists the devices signed in to this account and lets the user sign them out. */
export function SessionsCard() {
    const { data: current } = useSession();
    const [sessions, setSessions] = useState<SessionRow[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await authClient.listSessions();
        setSessions((res.data as SessionRow[] | null) ?? []);
    }, []);

    useEffect(() => {
        load().catch(() => setSessions([]));
    }, [load]);

    const currentToken = current?.session?.token;

    const revoke = async (token: string) => {
        setBusy(token);
        try {
            await authClient.revokeSession({ token });
            toast.success("Device signed out.");
            await load();
        } catch (e) {
            toast.error((e as Error).message || "Could not sign out device.");
        } finally {
            setBusy(null);
        }
    };

    const revokeOthers = async () => {
        setBusy("others");
        try {
            await authClient.revokeOtherSessions();
            toast.success("Signed out from all other devices.");
            await load();
        } catch (e) {
            toast.error((e as Error).message || "Could not sign out devices.");
        } finally {
            setBusy(null);
        }
    };

    const others = (sessions ?? []).filter((s) => s.token !== currentToken);

    return (
        <Card className="border-border/60 shadow-md">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                        <MonitorSmartphoneIcon className="size-5 text-primary" />
                        Where you are signed in
                    </CardTitle>
                    <CardDescription>
                        Devices that are currently logged in to your account.
                    </CardDescription>
                </div>
                {others.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={busy !== null}
                        onClick={revokeOthers}
                    >
                        Sign out other devices
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                {sessions === null ? (
                    <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No active sessions found.
                    </p>
                ) : (
                    sessions.map((s) => {
                        const device = describeDevice(s.userAgent);
                        const isCurrent = s.token === currentToken;
                        const Icon = device.mobile ? SmartphoneIcon : LaptopIcon;
                        return (
                            <div
                                key={s.id}
                                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 font-medium">
                                            {device.name}
                                            {isCurrent && (
                                                <Badge variant="secondary">
                                                    This device
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {s.ipAddress || "IP not available"}{" "}
                                            · Signed in{" "}
                                            {format(
                                                new Date(s.createdAt),
                                                "PP p",
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {!isCurrent && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={busy !== null}
                                        onClick={() => revoke(s.token)}
                                    >
                                        Sign out
                                    </Button>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
