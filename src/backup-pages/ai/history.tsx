"use client"

import { useState } from "react"
import { AppHeader } from "~/components/dashboard/app-header"
import { GenerationPanel } from "~/components/dashboard/generation-panel"
import { CreditsPanel } from "~/components/dashboard/credits-panel"
import { HistoryPanel } from "~/components/dashboard/history-panel"
import AISidebar from "~/components/layout/ai/ai-sidebar"

const AIGenerationPage = () => {


    return (
        <div className="flex flex-col h-[calc(100vh-11vh)]  relative overflow-hidden  bg-gradient-to-b from-accent/40 via-accent/20 to-accent/10 backdrop-blur-sm ">
            <AISidebar />
            <HistoryPanel />
        </div>
    )
}

export default AIGenerationPage
