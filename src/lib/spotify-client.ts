import { db } from "~/server/db"
import type {
    UserPlaylistsResponse,
    UserTopTracksResponse,
    CurrentlyPlayingResponse,
    PlaylistTracksResponse,
} from "~/types/spotify"

// Define interfaces for Spotify API responses
interface SpotifyTokenRefreshResponse {
    access_token: string
    token_type: string
    scope: string
    expires_in: number
    refresh_token?: string
    error?: string
    error_description?: string
}

interface SpotifyErrorResponse {
    error: {
        status: number
        message: string
    }
}

// Type guard functions
function isSpotifyTokenRefreshResponse(data: unknown): data is SpotifyTokenRefreshResponse {
    return typeof data === "object" && data !== null && "access_token" in data
}

function isSpotifyErrorResponse(data: unknown): data is SpotifyErrorResponse {
    return typeof data === "object" && data !== null && "error" in data
}

class SpotifyClient {
    private userId: string
    private accessToken: string | null = null
    private refreshToken: string | null = null
    private expiresAt: Date | null = null

    constructor(userId: string) {
        this.userId = userId
    }

    private async refreshAccessToken(): Promise<void> {
        if (!this.refreshToken) {
            throw new Error("No refresh token available.")
        }

        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(
                    `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET}`,
                ).toString("base64")}`,
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: this.refreshToken,
            }),
        })

        const data: unknown = await response.json()

        if (!response.ok) {
            console.error("Failed to refresh Spotify token:", data)

            // Handle different error response formats
            if (isSpotifyErrorResponse(data)) {
                throw new Error(data.error.message ?? "Failed to refresh access token")
            }

            // Fallback for token error response format
            const errorData = data as { error_description?: string }
            throw new Error(errorData.error_description ?? "Failed to refresh access token")
        }

        if (!isSpotifyTokenRefreshResponse(data)) {
            throw new Error("Invalid token refresh response format")
        }

        this.accessToken = data.access_token
        this.expiresAt = new Date(Date.now() + data.expires_in * 1000)

        await db.spotifyAccount.update({
            where: { userId: this.userId },
            data: {
                accessToken: this.accessToken,
                expiresAt: this.expiresAt,
            },
        })
    }

    private async ensureAccessToken(): Promise<string> {
        if (!this.accessToken || (this.expiresAt && new Date() > this.expiresAt)) {
            await this.refreshAccessToken()
        }
        return this.accessToken!
    }

    public async init(): Promise<void> {
        const spotifyAccount = await db.spotifyAccount.findUnique({
            where: { userId: this.userId },
        })

        if (!spotifyAccount) {
            throw new Error("Spotify account not connected for this user.")
        }

        this.accessToken = spotifyAccount.accessToken
        this.refreshToken = spotifyAccount.refreshToken
        this.expiresAt = spotifyAccount.expiresAt
        await this.ensureAccessToken()
    }

    public async makeApiRequest<T>(
        endpoint: string,
        method = "GET",
        body?: Record<string, unknown>,
    ): Promise<T | string> {
        await this.ensureAccessToken()

        const headers: HeadersInit = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
        }

        const requestOptions: RequestInit = {
            method,
            headers,
        }

        if (body) {
            requestOptions.body = JSON.stringify(body)
        }

        const response = await fetch(`https://api.spotify.com/v1${endpoint}`, requestOptions)

        if (!response.ok) {
            const errorData: unknown = await response.json()
            console.error(`Spotify API request failed for ${endpoint}:`, errorData)

            if (isSpotifyErrorResponse(errorData)) {
                throw new Error(errorData.error.message || "Spotify API request failed")
            }

            throw new Error("Spotify API request failed")
        }

        // Check if the response body is empty before parsing as JSON
        const text = await response.text()
        if (text === "") {
            return "" // Return empty string if no content
        }
        return JSON.parse(text) as T
    }

    // New methods for Spotify API interactions
    public async getUserPlaylists(offset = 0, limit = 20): Promise<UserPlaylistsResponse> {
        return this.makeApiRequest<UserPlaylistsResponse>(
            `/me/playlists?limit=${limit}&offset=${offset}`,
        ) as Promise<UserPlaylistsResponse>
    }

    public async getUserTopTracks(
        offset = 0,
        limit = 20,
        time_range: "short_term" | "medium_term" | "long_term" = "medium_term",
    ): Promise<UserTopTracksResponse> {
        return this.makeApiRequest<UserTopTracksResponse>(
            `/me/top/tracks?limit=${limit}&offset=${offset}&time_range=${time_range}`,
        ) as Promise<UserTopTracksResponse>
    }

    public async getUserCurrentlyPlaying(): Promise<CurrentlyPlayingResponse | null> {
        const response = await this.makeApiRequest<CurrentlyPlayingResponse>("/me/player/currently-playing")
        if (typeof response === "string" && response === "") {
            return null // Spotify returns empty string for no content
        }
        return response as CurrentlyPlayingResponse
    }

    public async getPlaylistTracks(playlistId: string, offset = 0, limit = 20): Promise<PlaylistTracksResponse> {
        return this.makeApiRequest<PlaylistTracksResponse>(
            `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        ) as Promise<PlaylistTracksResponse>
    }
}

export default SpotifyClient
