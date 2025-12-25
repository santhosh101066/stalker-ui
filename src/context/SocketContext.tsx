import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { URL_PATHS } from '../api/api';
import { isTizenDevice } from '../utils/helpers';

interface Device {
    id: string;
    name: string;
    type: 'receiver' | 'controller';
    ip: string;
}

interface SocketContextProps {
    socket: Socket | null;
    isConnected: boolean;
    receivers: Device[];
    isReceiver: boolean;
    castTo: (targetDeviceId: string, media: any, playbackInfo?: any) => void;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

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
        // Determine device ID
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem('device_id', deviceId);
        }
        // Ensure separate variable for closure capture if needed, though const is fine
        const currentDeviceId = deviceId as string;

        const deviceName = isReceiver
            ? `TV (${currentDeviceId.substring(0, 4)})`
            : `Controller (${currentDeviceId.substring(0, 4)})`;

        const newSocket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'], // Allow polling fallback
            reconnection: true,
            reconnectionDelay: 10000,     // 10 seconds initial delay
            reconnectionDelayMax: 10000,  // 10 seconds max delay
            reconnectionAttempts: Infinity, // Keep retrying forever
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);

            // Register device
            newSocket.emit('register', {
                id: currentDeviceId,
                name: deviceName,
                type: isReceiver ? 'receiver' : 'controller',
            });

            // If we are a controller, ask for receivers
            if (!isReceiver) {
                newSocket.emit('get_receivers');
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('receivers_updated', (updatedReceivers: Device[]) => {
            // Filter out self
            setReceivers(updatedReceivers.filter(r => r.id !== currentDeviceId));
        });

        newSocket.on('receivers_list', (list: Device[]) => {
            setReceivers(list.filter(r => r.id !== currentDeviceId));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [SOCKET_URL, isReceiver]);

    const castTo = (targetDeviceId: string, media: any, playbackInfo?: any) => {
        if (!socket) return;
        socket.emit('cast_command', {
            targetDeviceId,
            command: 'play',
            payload: {
                media,
                playbackInfo
            }
        });
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, receivers, isReceiver, castTo }}>
            {children}
        </SocketContext.Provider>
    );
};
