export interface SpotifyImage {
    url: string;
    height: number | null;
    width: number | null;
}

export interface SpotifyArtist {
    id: string;
    name: string;
    uri: string;
    external_urls: { spotify: string };
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    images: SpotifyImage[];
    release_date: string;
    artists: SpotifyArtist[];
    uri: string;
    external_urls: { spotify: string };
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    duration_ms: number;
    explicit: boolean;
    popularity: number;
    preview_url: string | null;
    uri: string;
    external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
    collaborative: boolean;
    description: string | null;
    external_urls: { spotify: string };
    href: string;
    id: string;
    images: SpotifyImage[];
    name: string;
    owner: {
        display_name: string;
        id: string;
        external_urls: { spotify: string };
    };
    public: boolean;
    snapshot_id: string;
    tracks: {
        href: string;
        total: number;
    };
    type: string;
    uri: string;
}

export interface CurrentlyPlayingResponse {
    timestamp: number;
    context: {
        external_urls: { spotify: string };
        href: string;
        type: string;
        uri: string;
    } | null;
    progress_ms: number;
    is_playing: boolean;
    item: SpotifyTrack | null;
    currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
    actions: {
        disallows: {
            pausing?: boolean;
            resuming?: boolean;
            seeking?: boolean;
            skipping_next?: boolean;
            skipping_prev?: boolean;
            toggling_repeat_context?: boolean;
            toggling_shuffle?: boolean;
            toggling_repeat_track?: boolean;
            transferring_playback?: boolean;
        };
    };
}

export interface PlaylistTracksResponse {
    href: string;
    items: {
        added_at: string;
        added_by: { id: string; external_urls: { spotify: string } };
        is_local: boolean;
        primary_color: string | null;
        track: SpotifyTrack;
        video_thumbnail: { url: string | null };
    }[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
}

export interface UserPlaylistsResponse {
    href: string;
    items: SpotifyPlaylist[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
}

export interface UserTopTracksResponse {
    href: string;
    items: SpotifyTrack[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
}
export interface SpotifySearchResponse {
    tracks: {
        href: string;
        items: SpotifyTrack[];
        limit: number;
        next: string | null;
        offset: number;
        previous: string | null;
        total: number;
    };
}
