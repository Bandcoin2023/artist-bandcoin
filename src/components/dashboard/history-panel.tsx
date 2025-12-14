"use client"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/shadcn/ui/tabs"
import { GenerationHistoryView } from "~/components/history/generation-history-view"
import { CreditHistoryView } from "~/components/history/credit-history-view"
import { UsageAnalytics } from "~/components/history/usage-analytics"

export function HistoryPanel() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">History & Analytics</h1>
          <p className="text-muted-foreground">View your generation history and usage statistics</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="generations" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="generations">Generations</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="generations" className="mt-6">
            <GenerationHistoryView />
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <CreditHistoryView />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <UsageAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
