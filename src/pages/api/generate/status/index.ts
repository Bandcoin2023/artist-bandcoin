import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get("videoId")
    const provider = searchParams.get("provider")

    if (!videoId) {
        return NextResponse.json({ error: "Video ID required" }, { status: 400 })
    }

    if (provider === "openai") {
        if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
        }

        try {
            const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to get video status: ${response.statusText}`)
            }

            const video = await response.json()

            return NextResponse.json({
                status: video.status,
                progress: video.progress || 0,
            })
        } catch (error) {
            console.error("Error checking video status:", error)
            return NextResponse.json({ error: "Failed to check video status" }, { status: 500 })
        }
    }

    if (provider === "google") {
        if (!process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY) {
            return NextResponse.json({ error: "Google AI API key not configured" }, { status: 500 })
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${videoId}`, {
                headers: {
                    "x-goog-api-key": process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY,
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to get video status: ${response.statusText}`)
            }

            const operation = await response.json()

            return NextResponse.json({
                status: operation.done ? "completed" : "processing",
                progress: operation.metadata?.progress || 0,
            })
        } catch (error) {
            console.error("Error checking Google video status:", error)
            return NextResponse.json({ error: "Failed to check video status" }, { status: 500 })
        }
    }

    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
}
