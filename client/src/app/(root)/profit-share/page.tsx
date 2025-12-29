'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Users, History } from 'lucide-react';
import ProfitOverview from '@/components/profit-share/profit-overview';
import ShareholderList from '@/components/profit-share/shareholder-list';
import DistributionHistory from '@/components/profit-share/distribution-history';

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
                <TabsList className="grid w-full max-w-lg grid-cols-3">
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
            </Tabs>
        </div>
    );
}
