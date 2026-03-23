import type { NextApiRequest, NextApiResponse } from "next"
import crypto from "crypto"
import { env } from "~/env"

interface LastFmTokenResponse {
    session: {
        name: string
        key: string
        subscriber: number
    }
    error?: number
    message?: string
}

interface LastFmUserResponse {
    user: {
        name: string
        realname: string
        image: Array<{ "#text": string; size: string }>
        url: string
        country: string
        playcount: string
        subscriber: number
        registered: { unixtime: string }
    }
    error?: number
    message?: string
}

function isLastFmTokenResponse(data: unknown): data is LastFmTokenResponse {
    return (
        typeof data === "object" &&
        data !== null &&
        "session" in data &&
        typeof data.session === "object" &&
        data.session !== null &&
        "key" in data.session
    )
}

function isLastFmUserResponse(data: unknown): data is LastFmUserResponse {
    return (
        typeof data === "object" &&
        data !== null &&
        "user" in data &&
        typeof data.user === "object" &&
        data.user !== null &&
        "name" in data.user
    )
}

function isLastFmError(data: unknown): data is { error: number; message: string } {
    return (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        "message" in data
    )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" })
    }

    const { token, state } = req.query
    console.log(" req.cookies", req.cookies)
    console.log("Last.fm callback received with token:", token, "and state:", state)
    const redirectPath = '/lastfm' // Default fallback path

    if (!token) {
        return res.redirect(`${redirectPath}?error=missing_parameters`)
    }


    const tokenParam = Array.isArray(token) ? token[0] : token


    if (!tokenParam) {
        return res.redirect(`${redirectPath}?error=invalid_parameters`)
    }

    try {
        // Get session key from Last.fm using the token
        const apiKey = env.NEXT_PUBLIC_ARTIST_LASTFM_API_KEY
        const apiSecret = env.NEXT_PUBLIC_ARTIST_LASTFM_SHARED_SECRET

        if (!apiKey || !apiSecret) {
            throw new Error("Missing Last.fm API credentials")
        }

        // Build the signature for getSession call
        const params = new URLSearchParams({
            method: "auth.getSession",
            token: tokenParam,
            api_key: apiKey,
        })

        // Create MD5 signature
        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}${v}`)
            .join("")

        const signature = crypto.createHash("md5").update(sortedParams + apiSecret).digest("hex")

        params.append("api_sig", signature)
        params.append("format", "json")

        const sessionResponse = await fetch(`https://ws.audioscrobbler.com/2.0/?${params.toString()}`, {
            method: "POST",
        })

        const sessionData: unknown = await sessionResponse.json()

        console.log("[Last.fm] Session response:", sessionData)

        if (!sessionResponse.ok || isLastFmError(sessionData)) {
            const errorMsg = isLastFmError(sessionData) ? sessionData.message : "Failed to get session"
            throw new Error(errorMsg)
        }

        if (!isLastFmTokenResponse(sessionData)) {
            throw new Error("Invalid session response format")
        }

        const sessionKey = sessionData.session.key
        const username = sessionData.session.name

        // Get user info
        const userParams = new URLSearchParams({
            method: "user.getInfo",
            user: username,
            api_key: apiKey,
            format: "json",
        })

        const userResponse = await fetch(`https://ws.audioscrobbler.com/2.0/?${userParams.toString()}`)
        const userData: unknown = await userResponse.json()

        console.log("[Last.fm] User response:", userData)

        if (!userResponse.ok || isLastFmError(userData)) {
            throw new Error("Failed to get user data")
        }

        if (!isLastFmUserResponse(userData)) {
            throw new Error("Invalid user response format")
        }

        const userInfo = userData.user
        const profileImage = userInfo.image?.[userInfo.image.length - 1]?.["#text"] ?? null
        console.log("Session, userData", sessionKey, userInfo, profileImage)

        // Store Last.fm data in session/cookie for frontend to access
        const lastFmData = {
            username: userInfo.name,
            realName: userInfo.realname,
            sessionKey: sessionKey,
            profileUrl: userInfo.url,
            image: profileImage,
            playCount: parseInt(userInfo.playcount) || 0,
            country: userInfo.country,
        }

        // Encode data as JSON string in query parameter
        const encodedData = encodeURIComponent(JSON.stringify(lastFmData))

        res.redirect(`${redirectPath}?success=true&lastfmData=${encodedData}`)
    } catch (error) {
        console.error("[Last.fm] Auth error:", error)
        res.redirect(`${redirectPath}?error=connection_failed`)
    }
}
