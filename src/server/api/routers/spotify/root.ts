import { createTRPCRouter } from "~/server/api/trpc";
import { spotifyRouter } from "./spotify";
import { spotifyRewardRouter } from "./reward";


/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const SpotifyRouter = createTRPCRouter({
    spotifyRouter: spotifyRouter,
    spotifyReward: spotifyRewardRouter,
});

// export type definition of API
export type AppRouter = typeof SpotifyRouter;