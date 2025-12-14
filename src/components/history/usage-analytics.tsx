"use client"

import { TrendingUp, Zap, ImageIcon, Video, DollarSign } from "lucide-react"
import { Card } from "~/components/shadcn/ui/card"
import { Progress } from "~/components/shadcn/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { useState } from "react"
import { api } from "~/utils/api"

export function UsageAnalytics() {
  const [period] = useState<"7d" | "30d" | "90d">("30d")

  const { data: statsData, isLoading: statsLoading } = api.credit.getUsageStats.useQuery()
  const { data: contentData, isLoading: contentLoading } = api.ai.getAllAiContent.useQuery({})

  if (statsLoading || contentLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const generations = contentData?.content ?? []
  const imageGenerations = generations.filter((g) => g.contentType === "IMAGE").length
  const videoGenerations = generations.filter((g) => g.contentType === "VIDEO").length
  const totalGenerations = generations.length

  const stats = {
    totalGenerations: statsData?.generationsLast30Days ?? 0,
    totalCreditsUsed: statsData?.totalCreditsSpent ?? 0,
    totalCreditsSpent: statsData?.totalCreditsSpent ?? 0,
    imageGenerations,
    videoGenerations,
    averageCostPerGeneration: totalGenerations > 0 ? (statsData?.totalCreditsSpent ?? 0) / totalGenerations : 0,
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Tabs value={period}>
        <TabsList>
          <TabsTrigger value="7d">Last 7 days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 days</TabsTrigger>
          <TabsTrigger value="90d">Last 90 days</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Generations"
          value={stats.totalGenerations.toString()}
          icon={Zap}
          color="text-purple-600 dark:text-purple-500"
          bgColor="bg-purple-100 dark:bg-purple-950/30"
        />
        <StatCard
          title="Credits Used"
          value={stats.totalCreditsUsed.toLocaleString()}
          icon={DollarSign}
          color="text-blue-600 dark:text-blue-500"
          bgColor="bg-blue-100 dark:bg-blue-950/30"
        />
        <StatCard
          title="Avg Cost/Generation"
          value={stats.averageCostPerGeneration.toFixed(1)}
          icon={TrendingUp}
          color="text-green-600 dark:text-green-500"
          bgColor="bg-green-100 dark:bg-green-950/30"
        />
      </div>

      {/* Generation Type Breakdown */}
      {totalGenerations > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Generation Breakdown</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/30 rounded">
                    <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  </div>
                  <span className="font-medium">Images</span>
                </div>
                <span className="font-bold">{stats.imageGenerations}</span>
              </div>
              <Progress value={(stats.imageGenerations / stats.totalGenerations) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {((stats.imageGenerations / stats.totalGenerations) * 100).toFixed(0)}% of total
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-100 dark:bg-cyan-950/30 rounded">
                    <Video className="h-4 w-4 text-cyan-600 dark:text-cyan-500" />
                  </div>
                  <span className="font-medium">Videos</span>
                </div>
                <span className="font-bold">{stats.videoGenerations}</span>
              </div>
              <Progress value={(stats.videoGenerations / stats.totalGenerations) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {((stats.videoGenerations / stats.totalGenerations) * 100).toFixed(0)}% of total
              </p>
            </div>
          </div>
        </Card>
      )}

      {totalGenerations === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No generation data yet</p>
            <p className="text-sm">Start creating AI content to see your usage analytics</p>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string
  value: string
  icon: any
  color: string
  bgColor: string
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </div>
    </Card>
  )
}
