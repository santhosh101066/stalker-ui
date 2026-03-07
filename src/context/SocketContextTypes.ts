import { Socket } from 'socket.io-client';

export interface Device {
    id: string;
    name: string;
    type: 'receiver' | 'controller';
    ip: string;
}

export interface PlaybackInfo {
    currentTime?: number;
    volume?: number;
    muted?: boolean;
    subtitleTrackIndex?: number;
    audioTrackIndex?: number;
}

export interface SocketContextProps {
    socket: Socket | null;
    isConnected: boolean;
    receivers: Device[];
    isReceiver: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    castTo: (targetDeviceId: string, media: any, playbackInfo?: PlaybackInfo) => void;
    refreshReceivers: () => void;
}
