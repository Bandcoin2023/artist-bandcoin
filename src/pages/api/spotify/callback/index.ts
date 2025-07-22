
import type { NextApiRequest, NextApiResponse } from "next"
import { db } from "~/server/db"

// Define interfaces for Spotify API responses
interface SpotifyTokenResponse {
    access_token: string
    token_type: string
    scope: string
    expires_in: number
    refresh_token: string
    error?: string
    error_description?: string
}

interface SpotifyImage {
    url: string
    height: number
    width: number
}

interface SpotifyUserResponse {
    id: string
    display_name: string
    email: string
    images: SpotifyImage[]
}

interface SpotifyErrorResponse {
    error: {
        status: number
        message: string
    }
}

// Type guard functions
function isSpotifyTokenResponse(data: unknown): data is SpotifyTokenResponse {
    return typeof data === "object" && data !== null && "access_token" in data
}

function isSpotifyUserResponse(data: unknown): data is SpotifyUserResponse {
    return typeof data === "object" && data !== null && "id" in data
}

function isSpotifyErrorResponse(data: unknown): data is SpotifyErrorResponse {
    return typeof data === "object" && data !== null && "error" in data
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" })
    }

    const { code, state, error } = req.query

    // Determine the redirect path based on the 'state' parameter
    let redirectPath = '/'; // Default fallback path

    const stateParam = Array.isArray(state) ? state[0] : state;
    if (stateParam) {
        const parts = stateParam.split('_');
        if (parts.length > 1) {
            try {
                redirectPath = decodeURIComponent(parts.slice(1).join('_'));
                // Basic validation to ensure it's a relative path
                if (!redirectPath.startsWith('/')) {
                    redirectPath = '/'; // Fallback if not a valid path
                }
            } catch (e) {
                console.error("Error decoding referrer path:", e);
                redirectPath = '/'; // Fallback on decode error
            }
        }
    }

    if (error) {
        const errorParam = Array.isArray(error) ? error[0] : error
        return res.redirect(`${redirectPath}?error=${encodeURIComponent(errorParam ?? "unknown_error")}`)
    }

    if (!code || !stateParam) {
        return res.redirect(`${redirectPath}?error=missing_parameters`)
    }
    console.log("State Parameter:", stateParam);
    // Extract userId from stateParam
    const userId = stateParam.split('_')[0];
    if (!userId) {
        return res.redirect(`${redirectPath}?error=invalid_user_id`);
    }

    // Ensure code is a string
    const authCode = Array.isArray(code) ? code[0] : code;

    if (!authCode) {
        return res.redirect(`${redirectPath}?error=invalid_parameters`);
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(
                    `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET}`,
                ).toString("base64")}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: authCode,
                redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? "",
            }),
        })

        const tokenData: unknown = await tokenResponse.json()
        console.log("Token Data:", tokenData)
        if (!tokenResponse.ok) {
            if (isSpotifyErrorResponse(tokenData)) {
                throw new Error(tokenData.error.message ?? "Failed to get access token")
            }
            // Fallback for token error response format
            const errorData = tokenData as { error_description?: string }
            throw new Error(errorData.error_description ?? "Failed to get access token")
        }

        if (!isSpotifyTokenResponse(tokenData)) {
            throw new Error("Invalid token response format")
        }

        // Get user profile
        const userResponse = await fetch("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        })

        const userData: unknown = await userResponse.json()

        if (!userResponse.ok) {
            throw new Error("Failed to get user data")
        }

        if (!isSpotifyUserResponse(userData)) {
            throw new Error("Invalid user response format")
        }

        console.log("Token Data:", tokenData)
        console.log("User Data:", userData)
        console.log("State:", stateParam)

        await db.spotifyAccount.upsert({
            where: { userId: userId }, // Use extracted userId
            update: {
                name: userData.display_name,
                email: userData.email,
                image: userData.images?.[0]?.url,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            },
            create: {
                userId: userId, // Use extracted userId
                spotifyId: userData.id,
                name: userData.display_name,
                email: userData.email,
                image: userData.images?.[0]?.url,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            },
        })

        res.redirect(`${redirectPath}?success=true`)
    } catch (error) {
        console.error("Spotify auth error:", error)
        res.redirect(`${redirectPath}?error=connection_failed`)
    }
}