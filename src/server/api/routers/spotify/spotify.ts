import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import SpotifyClient from '~/lib/spotify-client';
import type SpotifyClientType from '~/lib/spotify-client';
import { TRPCError } from '@trpc/server';
import { UserPlaylistsResponse, UserTopTracksResponse, CurrentlyPlayingResponse, PlaylistTracksResponse, SpotifyPlaylist, SpotifyTrack, SpotifySearchResponse } from '~/types/spotify';

export const spotifyRouter = createTRPCRouter({
    getSpotifyAccount: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.spotifyAccount.findUnique({
            where: { userId: ctx.session.user.id },
        });
    }),

    getUserPlaylists: protectedProcedure.query(async ({ ctx }): Promise<SpotifyPlaylist[]> => {
        try {
            const spotifyClient: SpotifyClientType = new SpotifyClient(ctx.session.user.id);
            await spotifyClient.init();
            const data = await spotifyClient.getUserPlaylists(0, 10);
            return data.items;
        } catch (error) {
            console.error('Failed to fetch Spotify playlists:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch Spotify playlists.',
            });
        }
    }),

    getUserTopTracks: protectedProcedure.query(async ({ ctx }): Promise<SpotifyTrack[]> => {
        try {
            const spotifyClient: SpotifyClientType = new SpotifyClient(ctx.session.user.id);
            await spotifyClient.init();
            const data = await spotifyClient.getUserTopTracks(0, 10, 'medium_term');
            return data.items;
        } catch (error) {
            console.error('Failed to fetch Spotify top tracks:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch Spotify top tracks.',
            });
        }
    }),

    getUserCurrentlyPlaying: protectedProcedure.query(async ({ ctx }): Promise<CurrentlyPlayingResponse | null> => {
        try {
            const spotifyClient: SpotifyClientType = new SpotifyClient(ctx.session.user.id);
            await spotifyClient.init();
            const data = await spotifyClient.getUserCurrentlyPlaying();
            return data;
        } catch (error) {
            console.error('Failed to fetch Spotify currently playing track:', error);
            if (error instanceof Error && error.message.includes('No content')) {
                return null;
            }
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch currently playing track.',
            });
        }
    }),

    getPlaylistTracks: protectedProcedure
        .input(z.object({
            playlistId: z.string(),
            limit: z.number().default(10),
            cursor: z.number().nullish(),
        }))
        .query(async ({ ctx, input }): Promise<PlaylistTracksResponse> => {
            try {
                const spotifyClient: SpotifyClientType = new SpotifyClient(ctx.session.user.id);
                await spotifyClient.init();
                const data = await spotifyClient.getPlaylistTracks(input.playlistId, input.cursor ?? 0, input.limit);
                return data;
            } catch (error) {
                console.error(`Failed to fetch tracks for playlist ${input.playlistId}:`, error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to fetch tracks for playlist ${input.playlistId}.`,
                });
            }
        }),

    searchTracks: protectedProcedure
        .input(z.object({
            query: z.string().min(1, "Search query cannot be empty."),
            limit: z.number().default(10),
            offset: z.number().default(0),
        }))
        .query(async ({ ctx, input }): Promise<SpotifyTrack[]> => {
            try {
                const spotifyClient: SpotifyClientType = new SpotifyClient(ctx.session.user.id);
                await spotifyClient.init();
                const data = await spotifyClient.searchTracks(input.query, input.offset, input.limit);
                return data;
            } catch (error) {
                console.error(`Failed to search Spotify tracks for query "${input.query}":`, error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to search Spotify tracks.`,
                });
            }
        }),

    disconnectSpotify: protectedProcedure.mutation(async ({ ctx }) => {
        try {
            await ctx.db.spotifyAccount.delete({
                where: { userId: ctx.session.user.id },
            });
            return { success: true };
        } catch (error) {
            console.error('Failed to disconnect Spotify account:', error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to disconnect Spotify account.',
            });
        }
    }),
});