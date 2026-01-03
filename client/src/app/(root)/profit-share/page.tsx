'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Users, History, Building2, ArrowRightLeft } from 'lucide-react';
import ProfitOverview from '@/components/profit-share/profit-overview';
import ShareholderList from '@/components/profit-share/shareholder-list';
import DistributionHistory from '@/components/profit-share/distribution-history';
import { AddBusinessDialog } from '@/components/profit-share/add-business-dialog';
import { TransferProfitDialog } from '@/components/profit-share/transfer-profit-dialog';
import { BusinessList } from '@/components/profit-share/business-list';
import { TransferHistory } from '@/components/profit-share/transfer-history';

export default function ProfitSharePage() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Profit Share</h1>
                <p className="text-muted-foreground">
                    Manage shareholders and distribute profits
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-4xl grid-cols-5">
                    <TabsTrigger value="overview" className="gap-2">
                        <PieChart className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="shareholders" className="gap-2">
                        <Users className="h-4 w-4" />
                        Shareholders
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="h-4 w-4" />
                        History
                    </TabsTrigger>
                    <TabsTrigger value="external" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        External Business
                    </TabsTrigger>
                    <TabsTrigger value="transfers" className="gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Transfers
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <ProfitOverview />
                </TabsContent>

                <TabsContent value="shareholders" className="mt-6">
                    <ShareholderList />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <DistributionHistory />
                </TabsContent>

                <TabsContent value="external" className="mt-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">External Businesses</h2>
                            <p className="text-sm text-muted-foreground">
                                Manage external businesses for profit transfer tracking
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <TransferProfitDialog />
                            <AddBusinessDialog />
                        </div>
                    </div>
                    <BusinessList />
                </TabsContent>

                <TabsContent value="transfers" className="mt-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">Transfer History</h2>
                            <p className="text-sm text-muted-foreground">
                                Track profit transfers to external businesses
                            </p>
                        </div>
                        <TransferProfitDialog />
                    </div>
                    <TransferHistory />
                </TabsContent>
            </Tabs>
        </div>
    );
}
