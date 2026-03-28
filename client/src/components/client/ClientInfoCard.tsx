import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Building, Globe, Layers, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Client } from "@/types/client.type";
import { CLIENT_STATUS_OPTIONS } from "@/lib/constants";

interface ClientInfoCardProps {
    client: Client;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
    const statusOpt = CLIENT_STATUS_OPTIONS.find((s) => s.value === client.status);

    return (
        <Card className="border-0 bg-linear-to-br from-primary/5 via-card to-card shadow-lg">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center justify-between">
                    <span>Client Information</span>
                    <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusOpt?.color}`}>
                        {statusOpt?.label}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Name</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{client.name}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{client.clientId}</p>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            <Mail className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Email(s)</p>
                            {client.emails.map((email, idx) => (
                                <p key={idx} className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={email}>
                                    {email}
                                </p>
                            ))}
                        </div>
                    </div>
                    {client.phone && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                <Phone className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Phone</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{client.phone}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Address Info */}
                <div className="space-y-4">
                    {client.officeAddress && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                <Building className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Office Address</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{client.officeAddress}</p>
                            </div>
                        </div>
                    )}
                    {client.address && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                <MapPin className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Shipping Address</p>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{client.address}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Other Info */}
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            <Globe className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Currency</p>
                            <Badge variant="secondary" className="mt-1 h-5 text-[10px] font-bold">{client.currency || "USD"}</Badge>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            <Calendar className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Created At</p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {format(new Date(client.createdAt), "MMMM dd, yyyy")}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Team Members & Assigned Services */}
            {(client.teamMembers?.length || 0) > 0 || (client.assignedServicesDetails?.length || 0) > 0 ? (
                <div className="px-6 pb-6 pt-2 border-t mt-4 flex flex-wrap gap-8">
                    {client.teamMembers && client.teamMembers.length > 0 && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest">Team Members ({client.teamMembers.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {client.teamMembers.map((member, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-slate-50 shadow-sm border-slate-200 text-slate-600">
                                        {member.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {client.assignedServicesDetails && client.assignedServicesDetails.length > 0 && (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest flex items-center gap-1">
                                <Layers className="h-3 w-3" /> Assigned Services ({client.assignedServicesDetails.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {client.assignedServicesDetails.map((service, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 shadow-sm">
                                        {service.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </Card>
    );
}
