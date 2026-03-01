
import React, { useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { URL_PATHS } from '@/services/api';
import { isTizenDevice } from '@/utils/helpers';
import { SocketContext } from '@/context/useSocket';
import type { Device } from '@/context/SocketContextTypes';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [receivers, setReceivers] = useState<Device[]>([]);

    // Use HOST directly
    const SOCKET_URL = URL_PATHS.HOST;

    const isTizen = isTizenDevice();
    // Allow manual override via query param for testing (e.g. ?device=receiver)
    const searchParams = new URLSearchParams(window.location.search);
    const isReceiver = isTizen || searchParams.get('device') === 'receiver';

    useEffect(() => {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem('device_id', deviceId);
        }
        const currentDeviceId = deviceId;

        const deviceName = isReceiver
            ? `TV (${currentDeviceId.substring(0, 4)})`
            : `Controller (${currentDeviceId.substring(0, 4)})`;

        const newSocket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
        });

        // Helper to handle list updates consistently
        const handleListUpdate = (data: any) => {
            const list = Array.isArray(data) ? data : (data.receivers || []);
            const filtered = list.filter((r: Device) => r.id !== currentDeviceId);
            setReceivers(filtered);
        };

        newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('register', {
                id: currentDeviceId,
                name: deviceName,
                type: isReceiver ? 'receiver' : 'controller',
            });
            // Request list immediately after register
            newSocket.emit('get_receivers');
        });

        newSocket.on('receivers_updated', handleListUpdate);
        newSocket.on('receivers_list', handleListUpdate);

        newSocket.on('disconnect', () => setIsConnected(false));

        setSocket(newSocket);

        return () => {
            // Cleanup: remove listeners and disconnect
            newSocket.off('receivers_updated');
            newSocket.off('receivers_list');
            newSocket.disconnect();
        };
    }, [SOCKET_URL, isReceiver]); // isReceiver maaruna fresh socket setup aagum

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const castTo = (targetDeviceId: string, content: any, playbackInfo?: {
        currentTime?: number;
        volume?: number;
        muted?: boolean;
        subtitleTrackIndex?: number;
        audioTrackIndex?: number;
    }) => {
        if (!socket) return;
        socket.emit('cast_command', {
            targetDeviceId,
            command: 'play',
            payload: {
                ...content,
                playbackInfo
            }
        });
    };

    const refreshReceivers = () => {
        if (socket && isConnected) {
            socket.emit('get_receivers');
        }
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, receivers, isReceiver, castTo, refreshReceivers }}>
            {children}
        </SocketContext.Provider>
    );
};
