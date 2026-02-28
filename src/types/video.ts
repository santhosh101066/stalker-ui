import type { ChannelGroup, ContextType, EPG_List, MediaItem } from '@/types';

export type VideoFitMode = 'contain' | 'cover' | 'fill';

export interface MediaPlaylist {
    id: number;
    name: string;
    lang?: string;
}

export interface VideoPlayerProps {
    streamUrl: string | null;
    rawStreamUrl: string | null;
    onBack: () => void;
    itemId: string | null;
    context: ContextType;
    contentType: 'movie' | 'series' | 'tv';
    mediaId: string | null;
    item: MediaItem | null;
    seriesItem: MediaItem | null;
    channels?: MediaItem[];
    channelInfo?: MediaItem | null;
    onNextChannel?: () => void;
    onPrevChannel?: () => void;
    onChannelSelect?: (item: MediaItem) => void;
    previewChannelInfo?: MediaItem | null;
    epgData: Record<string, EPG_List[]>;
    channelGroups?: ChannelGroup[];
    favorites: string[];
    recentChannels?: string[];
    toggleFavorite: (item: MediaItem) => void;
    initialPlaybackState?: {
        currentTime?: number;
        volume?: number;
        muted?: boolean;
        subtitleTrackIndex?: number;
        audioTrackIndex?: number;
    };
}

export interface SeekOverlayData {
    visible: boolean;
    text: string;
    time: string;
}

export interface VideoLevel {
    height: number;
    width: number;
    bitrate: number;
    url: string;
}

export interface CastReceiver {
    id: string;
    name: string;
}
