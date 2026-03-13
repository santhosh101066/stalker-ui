import React, { useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { URL_PATHS } from '@/services/api';
import { isTizenDevice } from '@/utils/helpers';
import { SocketContext } from '@/context/useSocket';
import type { Device } from '@/context/SocketContextTypes';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [receivers, setReceivers] = useState<Device[]>([]);

  const SOCKET_URL = URL_PATHS.HOST;

  const isTizen = isTizenDevice();

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

    const handleListUpdate = (data: unknown) => {
      const list = (
        Array.isArray(data)
          ? data
          : (data as Record<string, unknown>).receivers || []
      ) as Device[];
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

      newSocket.emit('get_receivers');
    });

    newSocket.on('receivers_updated', handleListUpdate);
    newSocket.on('receivers_list', handleListUpdate);

    newSocket.on('disconnect', () => setIsConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.off('receivers_updated');
      newSocket.off('receivers_list');
      newSocket.disconnect();
    };
  }, [SOCKET_URL, isReceiver]);

  const castTo = (
    targetDeviceId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any,
    playbackInfo?: {
      currentTime?: number;
      volume?: number;
      muted?: boolean;
      subtitleTrackIndex?: number;
      audioTrackIndex?: number;
    }
  ) => {
    if (!socket) return;
    socket.emit('cast_command', {
      targetDeviceId,
      command: 'play',
      payload: {
        ...content,
        playbackInfo,
      },
    });
  };

  const refreshReceivers = () => {
    if (socket && isConnected) {
      socket.emit('get_receivers');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        receivers,
        isReceiver,
        castTo,
        refreshReceivers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
