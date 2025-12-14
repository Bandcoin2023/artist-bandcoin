"use client"

import { useState } from "react"
import { AppHeader } from "~/components/dashboard/app-header"
import { GenerationPanel } from "~/components/dashboard/generation-panel"
import { CreditsPanel } from "~/components/dashboard/credits-panel"
import { HistoryPanel } from "~/components/dashboard/history-panel"
import AISidebar from "~/components/layout/ai/ai-sidebar"

const AIGenerationPage = () => {


    return (
        <div className="flex flex-col h-[calc(100vh-11vh)] bg-background relative">
            <AISidebar />
            <CreditsPanel />
        </div>
    )
}

export default AIGenerationPage
