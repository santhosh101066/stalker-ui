import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/App';
import { SocketProvider } from '@/context/SocketContext.tsx';
import { AuthProvider } from '@/context/AuthContext.tsx';
import { HashRouter } from 'react-router-dom';
import ErrorBoundary from '@/components/organisms/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
