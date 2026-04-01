import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  Settings, 
  Terminal, 
  Users, 
  RefreshCw, 
  Globe, 
  ShieldCheck,
  Layout,
  X,
  LogOut,
} from 'lucide-react';
import { api } from '@/services/api';
import { getChannelGroups } from '@/services/services';
import ProfileManager from '@/components/organisms/ProfileManager';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import { useSocket } from '@/context/useSocket';

type Config = {
  hostname: string;
  port: string;
  contextPath: string;
  mac: string;
  deviceId1: string;
  deviceId2: string;
  serialNumber: string;
  stbType: string;
  groups: string[];
  proxy: boolean;
  tokens: string[];
  playCensored: boolean;
  providerType: 'stalker' | 'xtream';
  username?: string;
  password?: string;
};

type Group = {
  title: string;
};

const Admin = () => {
  const { socket } = useSocket();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem('admin_token');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'config' | 'logs'>('profiles');
  const [serverLogs, setServerLogs] = useState<{ level: string; message: string; timestamp: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [config, setConfig] = useState<Config>({
    hostname: '',
    port: '',
    contextPath: '',
    mac: '',
    deviceId1: '',
    deviceId2: '',
    serialNumber: '',
    stbType: '',
    groups: [],
    proxy: false,
    tokens: [],
    playCensored: false,
    providerType: 'stalker',
    username: '',
    password: '',
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isTokenVerified, setIsTokenVerified] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    (async () => {
      try {
        await api.get('/config', { signal: controller.signal });
        setIsTokenVerified(true);
      } catch {
        // Will be caught by global auth-expired
      }
    })();
    return () => controller.abort();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isTokenVerified) return;
    const controller = new AbortController();
    (async () => {
      try {
        await loadGroups(controller.signal);
        await loadConfig(controller.signal);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(error);
        }
      }
    })();
    return () => controller.abort();
  }, [isAuthenticated, isTokenVerified]);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('admin_token');
      setIsAuthenticated(false);
      setIsTokenVerified(false);
      toast.error('Session expired. Please log in again.', { toastId: 'auth-expired' });
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleLog = (log: { level: string; message: string; timestamp: string }) => {
      setServerLogs((prev) => {
        const newLogs = [...prev, log];
        if (newLogs.length > 1000) return newLogs.slice(-1000);
        return newLogs;
      });
    };

    if (activeTab === 'logs') {
      socket.emit('start_logging');
      socket.on('server_log', handleLog);
    } else {
      socket.emit('stop_logging');
      socket.off('server_log', handleLog);
    }

    return () => {
      if (activeTab === 'logs') {
        socket.emit('stop_logging');
        socket.off('server_log', handleLog);
      }
    };
  }, [socket, activeTab]);

  useEffect(() => {
    if (autoScroll && activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serverLogs, activeTab, autoScroll]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    if (activeTab === 'config') {
      loadConfig(controller.signal).catch((error) => {
        if (error.name !== 'AbortError') console.error(error);
      });
    }
    return () => controller.abort();
  }, [activeTab, isAuthenticated]);

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleModalClose = () => {
    setShowImportModal(false);
    setImportText('');
  };

  const handleParseAndApply = () => {
    const lines = importText.split('\n');
    const newConfig: Partial<Config> = {};
    lines.forEach((line) => {
      if (line.includes('http')) {
        try {
          const url = new URL(line.trim());
          newConfig.hostname = url.hostname;
          newConfig.port = url.port || '80';
          const pathSegments = url.pathname.split('/').filter((segment) => segment !== '');
          newConfig.contextPath = pathSegments.length > 0 ? pathSegments[0] : '';
        } catch (error) {
          console.error('Invalid URL in import text:', error);
          toast.error('Invalid URL detected. Please check the input.');
        }
      } else if (line.toLowerCase().startsWith('mac-')) {
        newConfig.mac = line.substring(line.indexOf('-') + 1).trim();
      } else if (line.toLowerCase().startsWith('sn-')) {
        newConfig.serialNumber = line.substring(line.indexOf('-') + 1).trim();
      } else if (line.toLowerCase().startsWith('username=')) {
        newConfig.username = line.split('=')[1].trim();
      } else if (line.toLowerCase().startsWith('password=')) {
        newConfig.password = line.split('=')[1].trim();
      }
    });

    setConfig((prev) => ({ ...prev, ...newConfig }));
    toast.success('Configuration imported successfully!');
    handleModalClose();
  };

  const loadGroups = async (signal?: AbortSignal) => {
    try {
      const response = await getChannelGroups(true, signal);
      setGroups(response.data);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Error loading groups');
      }
    }
  };

  const loadConfig = async (signal?: AbortSignal) => {
    try {
      const response = await api.get('/config', { signal });
      const data = response.data as Partial<Config>;
      setConfig((prev) => ({
        ...prev,
        ...data,
        groups: Array.isArray(data.groups) ? data.groups : [],
        proxy: !!data.proxy,
        playCensored: !!data.playCensored,
        tokens: Array.isArray(data.tokens) ? data.tokens : [],
        providerType: data.providerType || 'stalker',
      }));
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Error loading configuration');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? target.checked : value,
    }));
  };

  const handleGroupsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setConfig((prev) => ({ ...prev, groups: selected }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await api.post<{ message?: string }>('/config', config);
      toast.success(response.data.message || 'Configuration updated successfully');
    } catch {
      toast.error('Error updating configuration');
    }
  };

  const handleReloadGroups = async () => {
    setLoadingGroups(true);
    try {
      await api.get('/v2/refresh-groups');
      toast.success('Groups refreshed successfully');
      await loadGroups();
    } catch {
      toast.error('Error refreshing groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleRefreshChannels = async () => {
    setLoadingChannels(true);
    try {
      await api.get('/v2/refresh-channels');
      toast.success('Channels refreshed successfully');
    } catch {
      toast.error('Error refreshing channels');
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleRefreshMovieGroups = async () => {
    setLoadingMovies(true);
    try {
      await api.get('/v2/refresh-movie-groups');
      toast.success('Movie groups refreshed successfully');
    } catch {
      toast.error('Error refreshing movie groups');
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleRefreshSeriesGroups = async () => {
    setLoadingSeries(true);
    try {
      await api.get('/v2/refresh-series-groups');
      toast.success('Series groups refreshed successfully');
    } catch {
      toast.error('Error refreshing Series groups');
    } finally {
      setLoadingSeries(false);
    }
  };


  const handleClearWatched = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear History',
      message: 'Are you sure you want to clear all watched and in-progress statuses?',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('video-completed-')) {
            localStorage.removeItem(key);
          }
        });
        toast.success('All watched statuses have been cleared.');
      },
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/admin', { password: passwordInput });
      const data = response.data as Record<string, unknown>;
      if (data?.success) {
        if (data.token && typeof data.token === 'string') {
          localStorage.setItem('admin_token', data.token);
        }
        setIsAuthenticated(true);
      }
    } catch {
      toast.error('Incorrect password');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl border border-gray-800 bg-gray-900/30 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 flex flex-col items-center">
            <ShieldCheck className="mb-4 text-blue-500" size={48} />
            <h2 className="text-2xl font-black text-white">Admin Access</h2>
            <p className="mt-2 text-sm text-gray-400">Please authenticate to continue</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Enter admin password"
                autoFocus
                data-focusable="true"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0"
              data-focusable="true"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isTokenVerified) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-blue-500" size={36} />
          <p className="text-sm font-bold text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-gray-200 selection:bg-blue-500/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* --- Header & Navigation --- */}
        <header className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div className="mb-2 text-center md:mb-0 md:text-left">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Admin <span className="text-blue-500">Dashboard</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage your IPTV server configuration and logs.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <nav className="flex w-full items-center gap-1 rounded-2xl border border-gray-800 bg-gray-900/50 p-1.5 backdrop-blur-md sm:w-auto">
              {[
                { id: 'profiles', label: 'Profiles', icon: Users },
                { id: 'config', label: 'Config', icon: Settings },
                { id: 'logs', label: 'Logs', icon: Terminal },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'profiles' | 'config' | 'logs')}
                  className={`flex flex-1 sm:flex-none justify-center items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                  data-focusable="true"
                >
                  <tab.icon size={16} className="hidden sm:inline-block" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl sm:rounded-xl bg-red-900/20 px-4 py-3 sm:py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-900/40 border border-red-900/30"
              data-focusable="true"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* --- Content Area --- */}
        <main className="transition-all duration-300">
          
          {activeTab === 'profiles' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ProfileManager />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900/40 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <h3 className="font-bold text-white">Live System Logs</h3>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-400">
                    Auto-scroll
                    <input 
                       type="checkbox" 
                       checked={autoScroll} 
                       onChange={(e) => setAutoScroll(e.target.checked)} 
                       className="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-offset-0" 
                    />
                  </label>
                  <button 
                    onClick={() => setServerLogs([])}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-gray-700"
                  >
                    Clear Terminal
                  </button>
                </div>
              </div>
              <div className="custom-scrollbar h-[600px] overflow-y-auto rounded-2xl border border-gray-800 bg-[#050505] p-6 font-mono text-[11px] leading-relaxed shadow-2xl">
                {serverLogs.length === 0 ? (
                  <div className="flex h-full items-center justify-center italic text-gray-600">No incoming logs...</div>
                ) : (
                  serverLogs.map((log, i) => (
                    <div key={i} className="group mb-1 flex gap-4 opacity-80 hover:opacity-100">
                      <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`font-bold uppercase ${log.level === 'error' || log.level === 'fatal' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-blue-400'}`}>{log.level}</span>
                      <span className="text-gray-300 break-all">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                
                {/* Left Column: Connection & Auth */}
                <div className="space-y-8">
                  {/* Connection Details */}
                  <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="text-blue-500" size={20} />
                        <h3 className="text-lg font-bold text-white">Connection Details</h3>
                      </div>
                      <button type="button" onClick={handleImportClick} className="text-xs font-bold text-blue-400 hover:underline">Import URL</button>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-950 p-1">
                        {['stalker', 'xtream'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setConfig(p => ({...p, providerType: type as 'stalker' | 'xtream'}))}
                            className={`rounded-lg py-2 text-xs font-black uppercase transition-all ${
                              config.providerType === type ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Server Hostname</label>
                          <input 
                            name="hostname" 
                            value={config.hostname} 
                            onChange={handleInputChange}
                            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            placeholder="portal.example.com"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Port</label>
                            <input name="port" value={config.port} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Context</label>
                            <input name="contextPath" value={config.contextPath} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500" placeholder="/c/" />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-6 border-t border-gray-800 pt-5">
                        <label className="flex cursor-pointer items-center gap-3">
                          <input type="checkbox" name="proxy" checked={config.proxy} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600" />
                          <span className="text-sm font-bold text-gray-300">HTTP Proxy</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3">
                          <input type="checkbox" name="playCensored" checked={config.playCensored} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-red-600" />
                          <span className="text-sm font-bold text-gray-300">Adult Content</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Credentials */}
                  <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
                    <div className="mb-6 flex items-center gap-2">
                      <ShieldCheck className="text-blue-500" size={20} />
                      <h3 className="text-lg font-bold text-white">Credentials</h3>
                    </div>

                    {config.providerType === 'xtream' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Username</label>
                          <input name="username" value={config.username} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Password</label>
                          <input name="password" type="text" value={config.password} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">MAC Address</label>
                          <input name="mac" value={config.mac} onChange={handleInputChange} placeholder="00:1A:79:..." className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 font-mono text-sm outline-none transition-all focus:border-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">STB Model</label>
                            <input name="stbType" value={config.stbType} onChange={handleInputChange} placeholder="MAG250" className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Serial Number</label>
                            <input name="serialNumber" value={config.serialNumber} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Device ID 1</label>
                            <input name="deviceId1" value={config.deviceId1} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs outline-none transition-all focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Device ID 2</label>
                            <input name="deviceId2" value={config.deviceId2} onChange={handleInputChange} className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs outline-none transition-all focus:border-blue-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {/* Right Column: Groups & Content */}
                <div className="space-y-8">
                  {/* Content Library */}
                  <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layout className="text-blue-500" size={20} />
                        <h3 className="text-lg font-bold text-white">Content Library</h3>
                      </div>
                      <button type="button" onClick={handleReloadGroups} disabled={loadingGroups} className="flex items-center gap-1.5 text-xs font-bold text-blue-400 disabled:opacity-50 hover:underline">
                        <RefreshCw size={14} className={loadingGroups ? 'animate-spin' : ''} />
                        Sync Groups
                      </button>
                    </div>
                    
                    <select
                      multiple
                      className="scrollbar-hide h-56 w-full rounded-2xl border border-gray-800 bg-gray-950 p-4 text-sm outline-none focus:border-blue-500"
                      value={config.groups}
                      onChange={handleGroupsChange}
                    >
                      {groups.map((g) => (
                        <option key={g.title} value={g.title} className="mb-1 rounded-lg p-2 checked:bg-blue-600">
                          {g.title}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 ml-1 text-[10px] text-gray-500">Hold Ctrl/Cmd to select multiple. {config.groups.length} selected.</p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {[
                        { label: 'Channels', action: handleRefreshChannels, loading: loadingChannels },
                        { label: 'Movies', action: handleRefreshMovieGroups, loading: loadingMovies },
                        { label: 'Series', action: handleRefreshSeriesGroups, loading: loadingSeries },
                        { 
                          label: 'Check Expiry', 
                          action: async () => {
                            try {
                              const { getExpiry } = await import('@/services/services');
                              const response = await getExpiry();
                              if (response.success && response.expiry) {
                                toast.success(`Expires on: ${response.expiry}`);
                              } else {
                                toast.info('No expiry date found or unlimited.');
                              }
                            } catch {
                              toast.error('Failed to check expiry.');
                            }
                          }, 
                          loading: false,
                          variant: 'success'
                        },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={btn.action}
                          disabled={btn.loading}
                          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase transition-all active:scale-95 disabled:opacity-50 ${
                            btn.variant === 'success' ? 'bg-green-900/20 text-green-500 hover:bg-green-900/40 border border-green-900/50' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {btn.loading && <RefreshCw size={12} className="animate-spin" />}
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Floating Action Bar */}
              <div className="sticky bottom-6 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-blue-500/30 bg-gray-900/80 p-4 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] backdrop-blur-xl md:p-5">
                <p className="hidden text-xs font-medium text-gray-400 sm:block sm:max-w-sm">Changes here apply immediately to the database but require a restart for active streams.</p>
                <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
                  <button type="button" onClick={handleClearWatched} className="flex-1 sm:flex-none rounded-xl px-2 sm:px-4 py-3 sm:py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 border border-red-500/20 sm:border-transparent bg-red-500/5 sm:bg-transparent">Clear History</button>
                  <button type="submit" className="flex-[2] sm:flex-none justify-center flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/40 transition-all hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0 sm:px-8">
                    Save Config
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
      
      {/* --- Modals --- */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
      
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-in zoom-in-95 rounded-3xl border border-gray-800 bg-[#0f111a] p-6 shadow-2xl duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Import Config Text</h2>
              <button onClick={handleModalClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <textarea
              className="h-48 w-full rounded-xl border border-gray-800 bg-gray-950 p-4 font-mono text-xs text-gray-300 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 custom-scrollbar"
              placeholder="Paste content with http://..., mac-..., username=..., password=..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
            ></textarea>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={handleModalClose} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleParseAndApply} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500">
                Parse & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;