import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api } from '@/services/api';

interface CustomWindow extends Window {
  __isSyncingFromServer?: boolean;
  tizen?: unknown;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  preferences: {
    preferredContentType?: 'movie' | 'series' | 'tv';
    favorites?: string[];
    recentChannels?: string[];
    videoFitMode?: string;
    lastSelectedCategory?: Record<string, string>;
    lastSelectedCategoryTitle?: Record<string, string>;
    recentCategories?: Record<string, string[]>;
    pinnedCategories?: Record<string, string[]>;
  };
}

interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  loading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (
    newPrefs: Partial<User['preferences']>
  ) => Promise<User['preferences']>;
  syncProgress: (
    mediaId: string,
    progress: number,
    completed: boolean
  ) => Promise<void>;
  isLoggedIn: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem('refresh_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Dynamically load Google Sign-In SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get<User>('/user/profile');
      if (response.data) {
        setUser(response.data);
        localStorage.setItem('auth_user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await refreshProfile();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token, refreshProfile]);

  const loginWithGoogle = async (idToken: string) => {
    try {
      const isTv =
        !!(window as CustomWindow).tizen ||
        (window.innerHeight === 1080 && window.innerWidth === 1920); // heuristic or TV check
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/google', {
        idToken,
        clientType: isTv ? 'tv' : 'web',
      });

      if (response.data) {
        const {
          accessToken,
          refreshToken: newRefreshToken,
          user: userData,
        } = response.data;
        setToken(accessToken);
        setRefreshToken(newRefreshToken);
        setUser(userData);

        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const isTv =
        !!(window as CustomWindow).tizen ||
        (window.innerHeight === 1080 && window.innerWidth === 1920); // heuristic or TV check
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/login', {
        email,
        password,
        clientType: isTv ? 'tv' : 'web',
      });

      if (response.data) {
        const {
          accessToken,
          refreshToken: newRefreshToken,
          user: userData,
        } = response.data;
        setToken(accessToken);
        setRefreshToken(newRefreshToken);
        setUser(userData);

        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', newRefreshToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Credentials login failed:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);

    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');

    window.location.hash = '/home';
  }, []);

  const updatePreferences = async (newPrefs: Partial<User['preferences']>) => {
    if (!token || !user) return {};
    try {
      const response = await api.put<{
        success: boolean;
        preferences: User['preferences'];
      }>('/user/preferences', newPrefs);
      if (response.data?.preferences) {
        const updatedUser = {
          ...user,
          preferences: response.data.preferences,
        };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return response.data.preferences;
      }
    } catch (error) {
      console.error('Failed to sync preferences:', error);
    }
    return user?.preferences || {};
  };

  const syncProgress = async (
    mediaId: string,
    progress: number,
    completed: boolean
  ) => {
    if (!token) return;
    try {
      await api.put('/user/progress', {
        mediaId,
        progress,
        completed,
      });
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  };

  // Listen to token expiry event from API client
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        user,
        loading,
        loginWithGoogle,
        loginWithCredentials,
        logout,
        updatePreferences,
        syncProgress,
        isLoggedIn: !!token,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
