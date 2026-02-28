import { createContext, useContext } from 'react';
import type { SocketContextProps } from '@/context/SocketContextTypes';

export const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
