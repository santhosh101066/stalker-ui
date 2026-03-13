import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/services/api';
import { getChannelGroups } from '@/services/services';
import ProfileManager from '@/components/organisms/ProfileManager';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import { useSocket } from '@/context/useSocket';
import { useRef } from 'react';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'config' | 'logs'>(
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
    const controller = new AbortController();
    if (activeTab === 'config') {
      loadConfig(controller.signal).catch((error) => {
        if (error.name !== 'AbortError') console.error(error);
      });
    }
    return () => controller.abort();
  }, [activeTab]);

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

    setConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
    toast.success('Configuration imported successfully!');
    handleModalClose();
  };

  const loadGroups = async (signal?: AbortSignal) => {
    try {
      const response = await getChannelGroups(true, signal);
      const data = response.data;
      setGroups(data);
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
    setConfig((prev) => ({
      ...prev,
      groups: selected,
    }));
  };

  type SubmitEvent = React.FormEvent<HTMLFormElement>;

  interface ConfigUpdateResponse {
    message?: string;
    [key: string]: string | undefined;
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    try {
      const response = await api.post<ConfigUpdateResponse>('/config', config);
      const result = response.data;
      toast.success(result.message || 'Configuration updated successfully');
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

  const handleAddToken = async () => {
    try {
      const response = await api.get('/v2/get-token');
      const newToken = (response.data as Record<string, unknown>)?.token as
        | string
        | undefined;
      if (newToken) {
        setConfig((prev) => ({
          ...prev,
          tokens: [...prev.tokens, newToken],
        }));
        toast.success('Token added successfully');
      } else {
        toast.error('Failed to add token');
      }
    } catch {
      toast.error('Error adding token');
    }
  };

  interface DeleteTokenHandler {
    (index: number): void;
  }

  const handleDeleteToken: DeleteTokenHandler = (index) => {
    setConfig((prev) => {
      const newTokens = [...prev.tokens];
      newTokens.splice(index, 1);
      return { ...prev, tokens: newTokens };
    });
  };

  const handleClearTokens = async () => {
    try {
      await api.post('/v2/clear-tokens', {});
      toast.success('All tokens cleared');
    } catch {
      toast.error('Error clearing tokens on server');
    }
    setConfig((prev) => ({
      ...prev,
      tokens: [],
    }));
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/admin', {
        password: passwordInput,
      });
      if ((response.data as Record<string, unknown>)?.success) {
        setIsAuthenticated(true);
      }
    } catch {
      toast.error('Incorrect password');
      setPasswordInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-xl">
          <h2 className="mb-6 text-center text-xl font-bold text-white">
            Admin Access
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter admin password"
                autoFocus
                data-focusable="true"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-500"
              data-focusable="true"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-6 mt-2 max-w-7xl px-2 sm:px-4">
      {}
      <div className="mb-6 flex items-center justify-between border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-2 py-2 text-xs font-bold transition-colors sm:px-6 sm:py-3 sm:text-sm ${
              activeTab === 'profiles'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            data-focusable="true"
          >
            Profiles
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-2 py-2 text-xs font-bold transition-colors sm:px-6 sm:py-3 sm:text-sm ${
              activeTab === 'config'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            data-focusable="true"
          >
            Current Configuration
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-2 py-2 text-xs font-bold transition-colors sm:px-6 sm:py-3 sm:text-sm ${
              activeTab === 'logs'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            data-focusable="true"
          >
            Server Logs
          </button>
        </div>
        <button
          onClick={handleClearWatched}
          data-focusable="true"
          className="rounded-lg bg-red-900/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/50"
        >
          Clear History
        </button>
      </div>

      {activeTab === 'profiles' ? (
        <ProfileManager />
      ) : activeTab === 'logs' ? (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="text-lg font-bold text-white">Live Server Logs</h3>
            <div className="flex gap-3">
              <label
                className="flex cursor-pointer items-center gap-2"
                data-focusable="true"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="peer sr-only"
                    data-focusable="true"
                  />
                  <div className="h-5 w-9 rounded-full bg-gray-600 peer-checked:bg-blue-600"></div>
                  <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-all peer-checked:translate-x-4"></div>
                </div>
                <span className="text-xs font-bold text-gray-300">
                  Auto-Scroll
                </span>
              </label>
              <button
                onClick={() => setServerLogs([])}
                className="rounded bg-gray-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-600"
                data-focusable="true"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="h-[600px] overflow-y-auto rounded-xl border border-gray-700 bg-black/90 p-4 text-left font-mono text-xs shadow-inner">
            {serverLogs.length === 0 ? (
              <div className="pt-10 text-center italic text-gray-500">
                Waiting for logs...
              </div>
            ) : (
              serverLogs.map((log, index) => (
                <div
                  key={index}
                  className="mb-1 flex gap-2 border-b border-gray-800/50 pb-1 last:border-0 hover:bg-white/5"
                >
                  <span className="w-20 flex-shrink-0 text-left text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour12: false,
                    })}
                  </span>
                  <span
                    className={`w-12 flex-shrink-0 text-left font-bold uppercase ${
                      log.level === 'error' || log.level === 'fatal'
                        ? 'text-red-500'
                        : log.level === 'warn'
                          ? 'text-yellow-500'
                          : 'text-blue-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all text-left text-gray-300">
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            {}
            <div className="space-y-6">
              {}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    Server Connection
                  </h3>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    data-focusable="true"
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Import Text
                  </button>
                </div>

                {}
                <div className="mb-4 rounded bg-gray-900/50 p-3">
                  <label className="mb-2 block text-xs font-medium uppercase text-blue-400">
                    Provider Type
                  </label>
                  <div className="flex gap-4">
                    <label
                      className="flex cursor-pointer items-center gap-2"
                      data-focusable="true"
                    >
                      <input
                        type="radio"
                        name="providerType"
                        value="stalker"
                        checked={config.providerType === 'stalker'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600"
                        data-focusable="true"
                      />
                      <span className="text-white">Stalker Middleware</span>
                    </label>
                    <label
                      className="flex cursor-pointer items-center gap-2"
                      data-focusable="true"
                    >
                      <input
                        type="radio"
                        name="providerType"
                        value="xtream"
                        checked={config.providerType === 'xtream'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600"
                        data-focusable="true"
                      />
                      <span className="text-white">Xtream Codes</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                      Hostname / URL
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      type="text"
                      name="hostname"
                      value={config.hostname}
                      onChange={handleInputChange}
                      placeholder="e.g. portal.iptv.com"
                      data-focusable="true"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                        Port
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="port"
                        value={config.port}
                        onChange={handleInputChange}
                        data-focusable="true"
                      />
                    </div>
                    {}
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                        Context Path
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="contextPath"
                        value={config.contextPath}
                        onChange={handleInputChange}
                        placeholder="e.g. stalker_portal"
                        data-focusable="true"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:gap-6">
                    <label
                      className="flex cursor-pointer items-center gap-2"
                      data-focusable="true"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          name="proxy"
                          checked={config.proxy}
                          onChange={handleInputChange}
                          className="peer sr-only"
                          data-focusable="true"
                        />
                        <div className="h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-blue-600"></div>
                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-5"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-300">
                        Enable Proxy
                      </span>
                    </label>
                    <label
                      className="flex cursor-pointer items-center gap-2"
                      data-focusable="true"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          name="playCensored"
                          checked={config.playCensored}
                          onChange={handleInputChange}
                          className="peer sr-only"
                          data-focusable="true"
                        />
                        <div className="h-6 w-11 rounded-full bg-gray-700 peer-checked:bg-red-600"></div>
                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-5"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-300">
                        Uncensored
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-sm sm:p-5">
                <h3 className="mb-4 text-lg font-bold text-white">
                  Authentication
                </h3>

                {config.providerType === 'xtream' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                        Username
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="username"
                        value={config.username}
                        onChange={handleInputChange}
                        data-focusable="true"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                        Password
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="password"
                        value={config.password}
                        onChange={handleInputChange}
                        data-focusable="true"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                        MAC Address
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="mac"
                        value={config.mac}
                        onChange={handleInputChange}
                        placeholder="00:1A:79:..."
                        data-focusable="true"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                          STB Model
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          type="text"
                          name="stbType"
                          value={config.stbType}
                          onChange={handleInputChange}
                          placeholder="MAG250"
                          data-focusable="true"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                          Serial Number
                        </label>
                        <input
                          className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          type="text"
                          name="serialNumber"
                          value={config.serialNumber}
                          onChange={handleInputChange}
                          data-focusable="true"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase text-gray-500">
                        Device ID
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-xs text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="deviceId1"
                        value={config.deviceId1}
                        onChange={handleInputChange}
                        data-focusable="true"
                      />
                      <input
                        className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2.5 text-xs text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        type="text"
                        name="deviceId2"
                        value={config.deviceId2}
                        onChange={handleInputChange}
                        data-focusable="true"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {}
            <div className="space-y-6">
              {}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    Content Groups
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReloadGroups}
                      disabled={loadingGroups}
                      data-focusable="true"
                      className="flex items-center gap-2 rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600 disabled:opacity-50"
                    >
                      {loadingGroups && (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      )}
                      Sync Groups
                    </button>
                  </div>
                </div>

                <select
                  multiple
                  className="h-48 w-full rounded-lg border border-gray-600 bg-gray-900/50 p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  value={config.groups}
                  onChange={handleGroupsChange}
                  data-focusable="true"
                >
                  {groups.map((g) => (
                    <option key={g.title} value={g.title}>
                      {g.title}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Hold Ctrl/Cmd to select multiple. {config.groups.length}{' '}
                  selected.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleRefreshChannels}
                    disabled={loadingChannels}
                    data-focusable="true"
                    className="flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold hover:bg-gray-600 disabled:opacity-50"
                  >
                    {loadingChannels && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    )}
                    Refresh Channels
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshMovieGroups}
                    disabled={loadingMovies}
                    data-focusable="true"
                    className="flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold hover:bg-gray-600 disabled:opacity-50"
                  >
                    {loadingMovies && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    )}
                    Refresh Movies
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshSeriesGroups}
                    disabled={loadingSeries}
                    data-focusable="true"
                    className="flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold hover:bg-gray-600 disabled:opacity-50"
                  >
                    {loadingSeries && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    )}
                    Refresh Series
                  </button>
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={async () => {
                      try {
                        const { getExpiry } = await import(
                          '@/services/services'
                        );
                        const response = await getExpiry();
                        if (response.success && response.expiry) {
                          toast.success(`Expires on: ${response.expiry}`);
                        } else {
                          toast.info('No expiry date found or unlimited.');
                        }
                      } catch {
                        toast.error('Failed to check expiry.');
                      }
                    }}
                    className="rounded-lg bg-green-900/30 px-3 py-2 text-xs font-bold text-green-400 hover:bg-green-900/50"
                  >
                    Check Expiry
                  </button>
                </div>
              </div>

              {}
              {config.providerType === 'stalker' && (
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      Auth Tokens
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClearTokens}
                        data-focusable="true"
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-900/50 p-2">
                    {config.tokens.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No tokens active.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {config.tokens.map((token, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between rounded bg-gray-800 p-2 text-xs"
                          >
                            <span className="w-full truncate pr-2 font-mono text-gray-400">
                              {token}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteToken(idx)}
                              data-focusable="true"
                              className="text-red-500 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToken}
                    data-focusable="true"
                    className="mt-3 w-full rounded-lg border border-dashed border-gray-600 py-2 text-sm text-gray-400 hover:bg-gray-700/50 hover:text-white"
                  >
                    + Request New Token
                  </button>
                </div>
              )}
            </div>

            {}
            <div className="sticky bottom-4 z-10 col-span-full rounded-xl border border-blue-500/30 bg-gray-900/90 p-4 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400 sm:text-sm">
                  Updates to <strong>Active Configuration</strong> will require
                  a server restart.
                </div>
                <button
                  type="submit"
                  data-focusable="true"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-500 sm:px-8 sm:py-3 sm:font-bold"
                >
                  Save & Restart Server
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-white">
              Import Config Text
            </h2>
            <textarea
              className="h-48 w-full rounded-lg border border-gray-700 bg-gray-800 p-3 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
              placeholder="Paste content with http://..., mac-..., username=..., password=..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              data-focusable="true"
              autoFocus
            ></textarea>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                data-focusable="true"
                className="rounded-lg px-4 py-2 text-sm font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParseAndApply}
                data-focusable="true"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
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
