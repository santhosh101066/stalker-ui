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
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Upload,
} from 'lucide-react';
import { getCarouselSlides, saveCarouselSlides, type CarouselSlide, uploadFile } from '@/services/services';
import { api } from '@/services/api';
import { getChannelGroups } from '@/services/services';
import ProfileManager from '@/components/organisms/ProfileManager';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import { useSocket } from '@/context/useSocket';
import { useAuth } from '@/context/AuthContext';
import UserManager from '@/components/organisms/UserManager';

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

interface AdminProps {
  onBack?: () => void;
}

const Admin: React.FC<AdminProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const { socket } = useSocket();
  const isAuthenticated = true;
  const [activeTab, setActiveTab] = useState<'profiles' | 'users' | 'config' | 'logs' | 'carousel'>(
    'profiles'
  );
  const [serverLogs, setServerLogs] = useState<
    { level: string; message: string; timestamp: string }[]
  >([]);
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
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleLog = (log: {
      level: string;
      message: string;
      timestamp: string;
    }) => {
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
          const pathSegments = url.pathname
            .split('/')
            .filter((segment) => segment !== '');
          newConfig.contextPath =
            pathSegments.length > 0 ? pathSegments[0] : '';
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

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
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
      toast.success(
        response.data.message || 'Configuration updated successfully'
      );
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
      message:
        'Are you sure you want to clear all watched and in-progress statuses?',
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

  const handleClearCache = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Server Cache',
      message:
        'Are you sure you want to clear the server cache? This will force reload metadata from the IPTV provider.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.post('/clear-cache');
          toast.success('Server cache cleared successfully.');
        } catch {
          toast.error('Failed to clear server cache.');
        }
      },
    });
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="text-gray-200 selection:bg-blue-500/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* --- Header & Navigation --- */}
        <header className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div className="mb-2 text-center md:mb-0 md:text-left">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Admin <span className="text-blue-500">Dashboard</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your IPTV server configuration and logs.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <nav className="flex w-full items-center gap-1 rounded-2xl border border-gray-800 bg-gray-900/50 p-1.5 backdrop-blur-md sm:w-auto">
              {[
                { id: 'profiles', label: 'Profiles', icon: Globe },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'carousel', label: 'Carousel', icon: Layout },
                { id: 'config', label: 'Config', icon: Settings },
                { id: 'logs', label: 'Logs', icon: Terminal },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as 'profiles' | 'users' | 'config' | 'logs' | 'carousel')
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition-all duration-200 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm ${
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
              onClick={() => {
                if (onBack) {
                  onBack();
                } else if (
                  window.history.state &&
                  window.history.state.view === 'admin'
                ) {
                  window.history.back();
                } else {
                  window.history.pushState({}, '', '');
                  window.dispatchEvent(
                    new PopStateEvent('popstate', { state: {} })
                  );
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-700/50 bg-gray-800 px-4 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-700 sm:w-auto sm:rounded-xl sm:py-2.5"
              data-focusable="true"
            >
              <Globe size={16} />
              <span>Back to TV</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-900/30 bg-red-900/20 px-4 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-900/40 sm:w-auto sm:rounded-xl sm:py-2.5"
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

          {activeTab === 'users' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <UserManager />
            </div>
          )}

          {activeTab === 'carousel' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CarouselConfigManager />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="animate-in fade-in zoom-in-95 space-y-4 duration-300">
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
                  <div className="flex h-full items-center justify-center italic text-gray-600">
                    No incoming logs...
                  </div>
                ) : (
                  serverLogs.map((log, i) => (
                    <div
                      key={i}
                      className="group mb-1 flex gap-4 opacity-80 hover:opacity-100"
                    >
                      <span className="text-gray-600">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`font-bold uppercase ${log.level === 'error' || log.level === 'fatal' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-blue-400'}`}
                      >
                        {log.level}
                      </span>
                      <span className="break-all text-gray-300">
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <form
              onSubmit={handleSubmit}
              className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left Column: Connection & Auth */}
                <div className="space-y-8">
                  {/* Connection Details */}
                  <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="text-blue-500" size={20} />
                        <h3 className="text-lg font-bold text-white">
                          Connection Details
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleImportClick}
                        className="text-xs font-bold text-blue-400 hover:underline"
                      >
                        Import URL
                      </button>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-950 p-1">
                        {['stalker', 'xtream'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              setConfig((p) => ({
                                ...p,
                                providerType: type as 'stalker' | 'xtream',
                              }))
                            }
                            className={`rounded-lg py-2 text-xs font-black uppercase transition-all ${
                              config.providerType === type
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Server Hostname
                          </label>
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
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Port
                            </label>
                            <input
                              name="port"
                              value={config.port}
                              onChange={handleInputChange}
                              className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Context
                            </label>
                            <input
                              name="contextPath"
                              value={config.contextPath}
                              onChange={handleInputChange}
                              className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                              placeholder="/c/"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-6 border-t border-gray-800 pt-5">
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            name="proxy"
                            checked={config.proxy}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600"
                          />
                          <span className="text-sm font-bold text-gray-300">
                            HTTP Proxy
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            name="playCensored"
                            checked={config.playCensored}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-red-600"
                          />
                          <span className="text-sm font-bold text-gray-300">
                            Adult Content
                          </span>
                        </label>
                      </div>
                    </div>
                  </section>

                  {/* Credentials */}
                  <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
                    <div className="mb-6 flex items-center gap-2">
                      <ShieldCheck className="text-blue-500" size={20} />
                      <h3 className="text-lg font-bold text-white">
                        Credentials
                      </h3>
                    </div>

                    {config.providerType === 'xtream' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Username
                          </label>
                          <input
                            name="username"
                            value={config.username}
                            onChange={handleInputChange}
                            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Password
                          </label>
                          <input
                            name="password"
                            type="text"
                            value={config.password}
                            onChange={handleInputChange}
                            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            MAC Address
                          </label>
                          <input
                            name="mac"
                            value={config.mac}
                            onChange={handleInputChange}
                            placeholder="00:1A:79:..."
                            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 font-mono text-sm outline-none transition-all focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              STB Model
                            </label>
                            <input
                              name="stbType"
                              value={config.stbType}
                              onChange={handleInputChange}
                              placeholder="MAG250"
                              className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Serial Number
                            </label>
                            <input
                              name="serialNumber"
                              value={config.serialNumber}
                              onChange={handleInputChange}
                              className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Device ID 1
                            </label>
                            <input
                              name="deviceId1"
                              value={config.deviceId1}
                              onChange={handleInputChange}
                              className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs outline-none transition-all focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Device ID 2
                            </label>
                            <input
                              name="deviceId2"
                              value={config.deviceId2}
                              onChange={handleInputChange}
                              className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs outline-none transition-all focus:border-blue-500"
                            />
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
                        <h3 className="text-lg font-bold text-white">
                          Content Library
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleReloadGroups}
                        disabled={loadingGroups}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:underline disabled:opacity-50"
                      >
                        <RefreshCw
                          size={14}
                          className={loadingGroups ? 'animate-spin' : ''}
                        />
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
                        <option
                          key={g.title}
                          value={g.title}
                          className="mb-1 rounded-lg p-2 checked:bg-blue-600"
                        >
                          {g.title}
                        </option>
                      ))}
                    </select>
                    <p className="ml-1 mt-2 text-[10px] text-gray-500">
                      Hold Ctrl/Cmd to select multiple. {config.groups.length}{' '}
                      selected.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {[
                        {
                          label: 'Channels',
                          action: handleRefreshChannels,
                          loading: loadingChannels,
                        },
                        {
                          label: 'Movies',
                          action: handleRefreshMovieGroups,
                          loading: loadingMovies,
                        },
                        {
                          label: 'Series',
                          action: handleRefreshSeriesGroups,
                          loading: loadingSeries,
                        },
                        {
                          label: 'Check Expiry',
                          action: async () => {
                            try {
                              const { getExpiry } = await import(
                                '@/services/services'
                              );
                              const response = await getExpiry();
                              if (response.success && response.expiry) {
                                toast.success(`Expires on: ${response.expiry}`);
                              } else {
                                toast.info(
                                  'No expiry date found or unlimited.'
                                );
                              }
                            } catch {
                              toast.error('Failed to check expiry.');
                            }
                          },
                          loading: false,
                          variant: 'success',
                        },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={btn.action}
                          disabled={btn.loading}
                          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase transition-all active:scale-95 disabled:opacity-50 ${
                            btn.variant === 'success'
                              ? 'border border-green-900/50 bg-green-900/20 text-green-500 hover:bg-green-900/40'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {btn.loading && (
                            <RefreshCw size={12} className="animate-spin" />
                          )}
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Floating Action Bar */}
              <div className="sticky bottom-6 z-20 flex flex-col items-center justify-between gap-4 rounded-2xl border border-blue-500/30 bg-gray-900/80 p-4 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] backdrop-blur-xl sm:flex-row md:p-5">
                <p className="hidden text-xs font-medium text-gray-400 sm:block sm:max-w-sm">
                  Changes here apply immediately to the database but require a
                  restart for active streams.
                </p>
                <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/5 px-2 py-3 text-xs font-bold text-blue-400 transition-colors hover:bg-blue-500/10 sm:flex-none sm:border-transparent sm:bg-transparent sm:px-4 sm:py-2"
                  >
                    Clear Cache
                  </button>
                  <button
                    type="button"
                    onClick={handleClearWatched}
                    className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 px-2 py-3 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 sm:flex-none sm:border-transparent sm:bg-transparent sm:px-4 sm:py-2"
                  >
                    Clear History
                  </button>
                  <button
                    type="submit"
                    className="flex flex-[2] justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/40 transition-all hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0 sm:flex-none sm:px-8"
                  >
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
          <div className="animate-in zoom-in-95 w-full max-w-lg rounded-3xl border border-gray-800 bg-[#0f111a] p-6 shadow-2xl duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">
                Import Config Text
              </h2>
              <button
                onClick={handleModalClose}
                className="text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              className="custom-scrollbar h-48 w-full rounded-xl border border-gray-800 bg-gray-950 p-4 font-mono text-xs text-gray-300 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Paste content with http://..., mac-..., username=..., password=..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
            ></textarea>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-xl px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParseAndApply}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
              >
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

const CarouselConfigManager: React.FC = () => {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [tabletImageUrl, setTabletImageUrl] = useState('');

  // Selected file states for deferred upload
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [tabletFile, setTabletFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);

  const [actionType, setActionType] = useState<'none' | 'play' | 'details'>('none');
  const [mediaType, setMediaType] = useState<'movie' | 'series' | 'tv'>('movie');
  const [mediaId, setMediaId] = useState('');
  const [order, setOrder] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'desktop' | 'tablet' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'desktop') {
      setDesktopFile(file);
    } else if (target === 'tablet') {
      setTabletFile(file);
    } else if (target === 'mobile') {
      setMobileFile(file);
    }
  };

  const clearFileSelect = (target: 'desktop' | 'tablet' | 'mobile') => {
    if (target === 'desktop') {
      setDesktopFile(null);
    } else if (target === 'tablet') {
      setTabletFile(null);
    } else if (target === 'mobile') {
      setMobileFile(null);
    }
  };

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const data = await getCarouselSlides();
      setSlides(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch {
      toast.error('Failed to load carousel slides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const openAddForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setMobileImageUrl('');
    setTabletImageUrl('');
    setDesktopFile(null);
    setTabletFile(null);
    setMobileFile(null);
    setActionType('none');
    setMediaType('movie');
    setMediaId('');
    setOrder(slides.length > 0 ? Math.max(...slides.map((s) => s.order || 0)) + 1 : 0);
    setEditingIndex(null);
    setShowForm(true);
  };

  const openEditForm = (slide: CarouselSlide, index: number) => {
    setTitle(slide.title || '');
    setDescription(slide.description || '');
    setImageUrl(slide.imageUrl || '');
    setMobileImageUrl(slide.mobileImageUrl || '');
    setTabletImageUrl(slide.tabletImageUrl || '');
    setDesktopFile(null);
    setTabletFile(null);
    setMobileFile(null);
    setActionType(slide.actionType);
    setMediaType(slide.mediaType || 'movie');
    setMediaId(slide.mediaId || '');
    setOrder(slide.order || 0);
    setEditingIndex(index);
    setShowForm(true);
  };

  const saveSlides = async (newSlides: CarouselSlide[], successMessage: string) => {
    try {
      const res = await saveCarouselSlides(newSlides);
      if (res.success) {
        setSlides(newSlides);
        toast.success(res.message || successMessage);
        window.dispatchEvent(new Event('carousel-changed'));
        return true;
      } else {
        toast.error('Failed to save slides to server');
        return false;
      }
    } catch {
      toast.error('Error saving slides to server');
      return false;
    }
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasDesktop = imageUrl.trim() !== '' || desktopFile !== null;
    const hasTablet = tabletImageUrl.trim() !== '' || tabletFile !== null;
    const hasMobile = mobileImageUrl.trim() !== '' || mobileFile !== null;

    if (!hasDesktop && !hasTablet && !hasMobile) {
      toast.error('At least one Image variation (Desktop, Tablet, or Mobile) is required');
      return;
    }

    setUploading(true);

    let finalImageUrl = imageUrl;
    let finalTabletImageUrl = tabletImageUrl;
    let finalMobileImageUrl = mobileImageUrl;

    try {
      // Upload Desktop File if selected
      if (desktopFile) {
        const res = await uploadFile(desktopFile);
        if (res.success && res.url) {
          finalImageUrl = res.url;
        } else {
          throw new Error(res.error || 'Failed to upload Desktop image');
        }
      }

      // Upload Tablet File if selected
      if (tabletFile) {
        const res = await uploadFile(tabletFile);
        if (res.success && res.url) {
          finalTabletImageUrl = res.url;
        } else {
          throw new Error(res.error || 'Failed to upload Tablet image');
        }
      }

      // Upload Mobile File if selected
      if (mobileFile) {
        const res = await uploadFile(mobileFile);
        if (res.success && res.url) {
          finalMobileImageUrl = res.url;
        } else {
          throw new Error(res.error || 'Failed to upload Mobile image');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error uploading file(s)';
      toast.error(errorMessage);
      setUploading(false);
      return;
    }

    const newSlide: CarouselSlide = {
      ...(editingIndex !== null && slides[editingIndex]?.id ? { id: slides[editingIndex].id } : {}),
      title,
      description,
      imageUrl: finalImageUrl,
      tabletImageUrl: finalTabletImageUrl,
      mobileImageUrl: finalMobileImageUrl,
      actionType,
      mediaType,
      mediaId,
      order: Number(order),
    };

    const updatedSlides = [...slides];
    if (editingIndex !== null) {
      updatedSlides[editingIndex] = newSlide;
    } else {
      updatedSlides.push(newSlide);
    }

    updatedSlides.sort((a, b) => (a.order || 0) - (b.order || 0));

    const saved = await saveSlides(updatedSlides, editingIndex !== null ? 'Slide updated successfully!' : 'Slide added successfully!');
    setUploading(false);
    if (saved) {
      setShowForm(false);
    }
  };

  const handleDeleteSlide = async (index: number) => {
    const updatedSlides = slides.filter((_, i) => i !== index);
    await saveSlides(updatedSlides, 'Slide deleted successfully!');
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newSlides.length) return;

    // Swap order values
    const tempOrder = newSlides[index].order;
    newSlides[index].order = newSlides[swapWith].order;
    newSlides[swapWith].order = tempOrder;

    // Sort again
    newSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
    await saveSlides(newSlides, 'Slide order updated successfully!');
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md text-center sm:text-left">
        <div>
          <h2 className="text-xl font-black text-white">Carousel Slides</h2>
          <p className="text-sm text-gray-500">Configure VOD welcome banner images and target actions.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button
            type="button"
            onClick={openAddForm}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-500"
            data-focusable="true"
          >
            <Plus size={16} />
            Add Slide
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSaveSlide} className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 space-y-4 text-left">
          <h3 className="text-lg font-black text-white">{editingIndex !== null ? 'Edit Slide' : 'Add New Slide'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Slide Title"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-800 bg-gray-950/20 rounded-2xl p-4 mt-2">
              <div className="md:col-span-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Image Variations</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">Specify a URL or choose a file for at least one variation. The others will fall back dynamically.</p>
                </div>
              </div>

              {/* Desktop/TV Variant */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Desktop / TV Image</label>
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider">16:9 Aspect</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    placeholder="https://... or upload"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'desktop')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      className="h-full rounded-xl bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700 flex items-center gap-1 whitespace-nowrap"
                      disabled={uploading}
                    >
                      <Upload size={12} />
                    </button>
                  </div>
                </div>
                {desktopFile && (
                  <div className="flex items-center justify-between bg-blue-950/30 border border-blue-900/30 rounded-lg px-2 py-1 mt-1 text-[10px] text-blue-300">
                    <span className="truncate max-w-[120px] font-medium">{desktopFile.name}</span>
                    <button
                      type="button"
                      onClick={() => clearFileSelect('desktop')}
                      className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="ml-1 text-[9px] text-gray-500 italic">Recommended: 1920x1080 resolution.</p>
              </div>

              {/* Tablet Variant */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Tablet Image</label>
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">4:3 Aspect</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tabletImageUrl}
                    onChange={(e) => setTabletImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    placeholder="https://... or upload"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'tablet')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      className="h-full rounded-xl bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700 flex items-center gap-1 whitespace-nowrap"
                      disabled={uploading}
                    >
                      <Upload size={12} />
                    </button>
                  </div>
                </div>
                {tabletFile && (
                  <div className="flex items-center justify-between bg-indigo-950/30 border border-indigo-900/30 rounded-lg px-2 py-1 mt-1 text-[10px] text-indigo-300">
                    <span className="truncate max-w-[120px] font-medium">{tabletFile.name}</span>
                    <button
                      type="button"
                      onClick={() => clearFileSelect('tablet')}
                      className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="ml-1 text-[9px] text-gray-500 italic">Recommended: 1024x768 resolution.</p>
              </div>

              {/* Mobile Variant */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Mobile Image</label>
                  <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider">16:9 / 4:3</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mobileImageUrl}
                    onChange={(e) => setMobileImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                    placeholder="https://... or upload"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'mobile')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      className="h-full rounded-xl bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700 flex items-center gap-1 whitespace-nowrap"
                      disabled={uploading}
                    >
                      <Upload size={12} />
                    </button>
                  </div>
                </div>
                {mobileFile && (
                  <div className="flex items-center justify-between bg-purple-950/30 border border-purple-900/30 rounded-lg px-2 py-1 mt-1 text-[10px] text-purple-300">
                    <span className="truncate max-w-[120px] font-medium">{mobileFile.name}</span>
                    <button
                      type="button"
                      onClick={() => clearFileSelect('mobile')}
                      className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="ml-1 text-[9px] text-gray-500 italic">Recommended: 640x360 or 640x480.</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Brief slide description..."
              />
            </div>
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as 'none' | 'play' | 'details')}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="none">No Action</option>
                <option value="play">Play Directly</option>
                <option value="details">Open Details Modal</option>
              </select>
            </div>
            {actionType !== 'none' && (
              <>
                <div>
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Media Type</label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as 'movie' | 'series' | 'tv')}
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                    <option value="tv">TV Channel</option>
                  </select>
                </div>
                <div>
                  <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Media ID</label>
                  <input
                    type="text"
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="Enter database ID or name"
                  />
                </div>
              </>
            )}
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Sort Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700"
              data-focusable="true"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-focusable="true"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Slide</span>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {slides.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-800 py-12 text-center text-gray-500 italic">
            No slides configured. Add a slide to see it in VOD main pages.
          </div>
        ) : (
          slides.map((slide, index) => (
            <div key={index} className="flex flex-col md:flex-row items-center gap-4 rounded-3xl border border-gray-800 bg-gray-900/10 p-4">
              <img
                src={slide.imageUrl || slide.tabletImageUrl || slide.mobileImageUrl}
                alt={slide.title || 'Banner image'}
                className="h-20 w-36 rounded-xl object-cover border border-gray-800"
              />
              <div className="flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-black text-gray-400">Order: {slide.order}</span>
                  {slide.imageUrl && (
                    <span className="rounded bg-blue-950/40 border border-blue-900/50 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                      Desktop
                    </span>
                  )}
                  {slide.tabletImageUrl && (
                    <span className="rounded bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                      Tablet
                    </span>
                  )}
                  {slide.mobileImageUrl && (
                    <span className="rounded bg-purple-950/40 border border-purple-900/50 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                      Mobile
                    </span>
                  )}
                  {slide.actionType !== 'none' && (
                    <span className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-black text-gray-300 uppercase">
                      {slide.actionType === 'play' ? 'Play' : 'Details'}: {slide.mediaType} ({slide.mediaId})
                    </span>
                  )}
                </div>
                <h4 className="mt-1 font-bold text-white">{slide.title || 'Untitled Banner'}</h4>
                <p className="text-xs text-gray-500 line-clamp-1">{slide.description || 'No description'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="rounded-lg bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 disabled:opacity-30"
                  data-focusable="true"
                  title="Move Up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === slides.length - 1}
                  className="rounded-lg bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 disabled:opacity-30"
                  data-focusable="true"
                  title="Move Down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(slide, index)}
                  className="rounded-lg bg-blue-900/20 border border-blue-900/40 p-2 text-blue-400 transition-colors hover:bg-blue-900/40"
                  data-focusable="true"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlide(index)}
                  className="rounded-lg bg-red-900/20 border border-red-900/40 p-2 text-red-500 transition-colors hover:bg-red-900/40"
                  data-focusable="true"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
