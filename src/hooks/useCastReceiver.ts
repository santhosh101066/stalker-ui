
import { useEffect, useState } from 'react';
import { useSocket } from '@/context/useSocket';
import { toast } from 'react-toastify';
import type { MediaItem } from '@/types';
import type { PlaybackInfo } from '@/context/SocketContextTypes';

interface CastReceiverProps {
    playCastedMedia: (media: MediaItem, streamUrl?: string, rawStreamUrl?: string) => void;
}

export function useCastReceiver({ playCastedMedia }: CastReceiverProps) {
    const { socket, isReceiver } = useSocket();
    const [pendingPlaybackState, setPendingPlaybackState] = useState<PlaybackInfo | undefined>(undefined);

    useEffect(() => {
        if (!socket || !isReceiver) return;

        const handleCastCommand = (data: { command: string; payload: { media: MediaItem; streamUrl?: string; rawStreamUrl?: string; playbackInfo?: PlaybackInfo }; from: string }) => {
            if (data.command === 'play') {
                const { media, streamUrl, rawStreamUrl, playbackInfo } = data.payload;
                toast.info(`Casting from ${data.from}...`);

                // Navigation block pannama direct-a player-a open panrom 🚀
                playCastedMedia(media, streamUrl, rawStreamUrl);

                if (playbackInfo) {
                    setPendingPlaybackState(playbackInfo);
                }
            }
        };

        socket.on('receive_cast_command', handleCastCommand);
        return () => {
            socket.off('receive_cast_command', handleCastCommand);
        };
    }, [socket, isReceiver, playCastedMedia]);

    return { pendingPlaybackState };
}