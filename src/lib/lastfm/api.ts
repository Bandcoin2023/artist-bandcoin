import crypto from "crypto"
import { env } from "~/env"

export interface LastFmTrack {
    name: string
    artist: {
        name: string
        url: string
    }
    url: string
    image: Array<{ "#text": string; size: string }>
    playcount?: string
    loved?: string
    date?: {
        uts: string
        "#text": string
    }
}


export interface LastFMSearchTrack {
    name: string
    artist: string
    url: string
    image: Array<{ "#text": string; size: string }>
}



class LastFmClient {
    private apiKey: string
    private apiSecret: string

    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey
        this.apiSecret = apiSecret
    }

    private buildSignature(params: Record<string, string>): string {
        const sorted = Object.keys(params)
            .sort()
            .map((key) => `${key}${params[key]}`)
            .join("")

        return crypto.createHash("md5").update(sorted + this.apiSecret).digest("hex")
    }

    private async makeUnsignedRequest(
        method: string,
        params: Record<string, string>,
    ): Promise<Record<string, unknown>> {
        const requestParams: Record<string, string> = {
            method,
            api_key: this.apiKey,
            format: "json",
            ...params,
        }

        const response = await fetch("https://ws.audioscrobbler.com/2.0/", {
            method: "POST",
            body: new URLSearchParams(requestParams),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(`Last.fm API Error: ${data.message || "Unknown error"}`)
        }

        return data
    }

    private async makeAuthenticatedRequest(
        method: string,
        params: Record<string, string>,
        sessionKey?: string,
    ): Promise<Record<string, unknown>> {
        const requestParams: Record<string, string> = {
            method,
            api_key: this.apiKey,
            ...params,
        }

        if (sessionKey) {
            requestParams.sk = sessionKey
        }

        const signature = this.buildSignature(requestParams)
        requestParams.api_sig = signature
        requestParams.format = "json"

        const response = await fetch("https://ws.audioscrobbler.com/2.0/", {
            method: "POST",
            body: new URLSearchParams(requestParams),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(`Last.fm API Error: ${data.message || "Unknown error"}`)
        }

        return data
    }

    async getRecentTracks(
        username: string,
        limit: number,
    ): Promise<LastFmTrack[]> {
        const data = await this.makeUnsignedRequest("user.getRecentTracks", {
            user: username,
            limit: String(limit),
            extended: "1",
            // last 7 days 
            from: String(Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60),
        })
        console.log("data", data)
        console.log("Recent tracks data", data.recenttracks?.track)

        // Handle both single object and array responses
        const tracks = data.recenttracks?.track
        if (!tracks) return []

        // If it's a single track, wrap it in an array
        return Array.isArray(tracks) ? tracks : [tracks]
    }

    async getTopTracks(
        username: string,
        period: "overall" | "7day" | "1month" | "3month" | "6month" | "12month" = "overall",
        limit: number,
    ): Promise<LastFmTrack[]> {
        const data = await this.makeUnsignedRequest("user.getTopTracks", {
            user: username,
            period,
            limit: String(limit),
        })
        console.log("Top tracks data", data.toptracks?.track)
        return data.toptracks?.track || []
    }



    async getLovedTracks(
        username: string,
        limit: number = 10,
    ): Promise<LastFmTrack[]> {
        const data = await this.makeUnsignedRequest("user.getLovedTracks", {
            user: username,
            limit: String(limit),
        })

        return data.lovedtracks?.track || []
    }

    async loveTrack(
        artist: string,
        track: string,
        sessionKey: string,
    ): Promise<any> {
        return this.makeAuthenticatedRequest(
            "track.love",
            {
                artist,
                track,
            },
            sessionKey,
        )
    }

    async unloveTrack(
        artist: string,
        track: string,
        sessionKey: string,
    ): Promise<any> {
        return this.makeAuthenticatedRequest(
            "track.unlove",
            {
                artist,
                track,
            },
            sessionKey,
        )
    }



    async getNowPlaying(username: string): Promise<LastFmTrack | null> {
        const data = await this.makeUnsignedRequest("user.getRecentTracks", {
            user: username,
            limit: "1",
        })

        const track = data.recenttracks?.track?.[0]
        if (track && track["@attr"]?.nowplaying === "true") {
            return track
        }
        return null
    }

    async getUserInfo(username: string): Promise<Record<string, unknown>> {
        return this.makeUnsignedRequest("user.getInfo", {
            user: username,
        })
    }

    async searchTracks(
        query: string,
        limit = 10,
    ): Promise<LastFMSearchTrack[]> {
        const data = await this.makeUnsignedRequest("track.search", {
            track: query,
            limit: String(limit),
        })
        console.log(data.results?.trackmatches?.track)
        return data.results?.trackmatches?.track || []
    }
}

export function createLastFmClient(): LastFmClient {
    const key = env.NEXT_PUBLIC_LASTFM_API_KEY
    const secret = env.NEXT_PUBLIC_LASTFM_SHARED_SECRET

    if (!key || !secret) {
        throw new Error("Missing Last.fm API credentials")
    }

    return new LastFmClient(key, secret)
}
