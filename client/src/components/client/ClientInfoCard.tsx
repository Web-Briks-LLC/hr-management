"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Mail,
    Phone,
    MapPin,
    Building2,
    Globe,
    Layers,
    User,
    Calendar,
    Users2,
    Headphones,
    FileText,
} from "lucide-react";
import { format } from "date-fns";
import type { Client } from "@/types/client.type";
import { CLIENT_STATUS_OPTIONS } from "@/lib/constants";

interface ClientInfoCardProps {
    client: Client;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
    const statusOpt = CLIENT_STATUS_OPTIONS.find((s) => s.value === client.status);

    const getInitials = (name?: string) => {
        if (!name) return "CL";
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    const telemarketerName =
        typeof client.assignedTelemarketer === "object" && client.assignedTelemarketer
            ? client.assignedTelemarketer.name
            : null;

    const telemarketerEmail =
        typeof client.assignedTelemarketer === "object" && client.assignedTelemarketer
            ? client.assignedTelemarketer.email
            : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Primary Profile & Contact Details */}
            <Card className="lg:col-span-2 border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 rounded-xl border border-border/60 bg-muted/50">
                                <AvatarFallback className="rounded-xl text-base font-bold bg-primary/10 text-primary">
                                    {getInitials(client.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl font-bold">
                                        {client.name}
                                    </CardTitle>
                                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-semibold">
                                        {client.clientId}
                                    </span>
                                </div>
                                <CardDescription className="text-xs mt-1 flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        Created{" "}
                                        {client.createdAt
                                            ? format(new Date(client.createdAt), "MMM dd, yyyy")
                                            : "N/A"}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                        Currency:{" "}
                                        <span className="font-semibold text-foreground">
                                            {client.currency || "USD"}
                                        </span>
                                    </span>
                                </CardDescription>
                            </div>
                        </div>

                        <Badge
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${statusOpt?.color}`}
                        >
                            {statusOpt?.label || "Active"}
                        </Badge>
                    </div>
                </CardHeader>

                <Separator />

                <CardContent className="pt-6 space-y-6">
                    {/* Contact & Address Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Email addresses */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                Email Addresses
                            </div>
                            <div className="space-y-1.5 pl-5">
                                {client.emails && client.emails.length > 0 ? (
                                    client.emails.map((email, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span className="font-medium text-foreground">{email}</span>
                                            {idx === 0 && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 font-normal text-muted-foreground">
                                                    Primary
                                                </Badge>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No email provided</p>
                                )}
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                Phone Number
                            </div>
                            <div className="pl-5">
                                {client.phone ? (
                                    <p className="text-sm font-medium text-foreground">{client.phone}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No phone provided</p>
                                )}
                            </div>
                        </div>

                        {/* Office Address */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5 text-primary" />
                                Office Address
                            </div>
                            <div className="pl-5">
                                {client.officeAddress ? (
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {client.officeAddress}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Not specified</p>
                                )}
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                Shipping / Billing Address
                            </div>
                            <div className="pl-5">
                                {client.address ? (
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {client.address}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Not specified</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description note if present */}
                    {client.description && (
                        <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                <FileText className="h-3.5 w-3.5" /> Client Notes / Description
                            </div>
                            <p className="text-sm text-foreground leading-relaxed pl-5">
                                {client.description}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right Col: Team Members & Telemarketer Assignment */}
            <div className="space-y-6">
                {/* Telemarketer Assignment Card */}
                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-primary" />
                            Assigned Telemarketer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {telemarketerName ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                        {getInitials(telemarketerName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {telemarketerName}
                                    </p>
                                    {telemarketerEmail && (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {telemarketerEmail}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                No telemarketer assigned
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Team Members Card */}
                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Users2 className="h-4 w-4 text-primary" />
                                Team Members
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs font-semibold">
                                {client.teamMembers?.length || 0}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {client.teamMembers && client.teamMembers.length > 0 ? (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                {client.teamMembers.map((member, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarFallback className="text-[10px] font-bold">
                                                    {getInitials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate">
                                                    {member.name}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {member.email}
                                                </p>
                                            </div>
                                        </div>
                                        {member.designation && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] shrink-0 font-normal text-muted-foreground"
                                            >
                                                {member.designation}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                No team members recorded
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
