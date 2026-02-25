"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function Home() {
    const [countdown, setCountdown] = useState(4);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = "https://webbriks.com";
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
            <Card className="w-full max-w-md border-destructive/20 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-destructive"></div>
                <CardHeader className="text-center pt-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-destructive/10 p-4 rounded-full">
                            <ShieldAlert className="w-12 h-12 text-destructive" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-foreground font-semibold">
                        Access Denied
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        You are not eligible to view this page. A valid payment
                        token is required.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-8">
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md inline-block">
                        Redirecting securely to Web Briks homepage in{" "}
                        <span className="font-bold text-foreground">
                            {countdown}s
                        </span>
                        ...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
