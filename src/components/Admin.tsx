import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../api/api"; // Assuming api.ts is in ../api

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
};

type Group = {
  title: string;
};

const Admin = () => {
  const [config, setConfig] = useState<Config>({
    hostname: "",
    port: "",
    contextPath: "",
    mac: "",
    deviceId1: "",
    deviceId2: "",
    serialNumber: "",
    stbType: "",
    groups: [],
    proxy: false,
    tokens: [],
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");

  // Load groups and config on mount
  useEffect(() => {
    (async () => {
      await loadGroups();
      await loadConfig();
    })();
  }, []);

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleModalClose = () => {
    setShowImportModal(false);
    setImportText(""); // Clear text when closing
  };

  const handleParseAndApply = () => {
    const lines = importText.split("\n");
    const newConfig: Partial<Config> = {};

    lines.forEach((line) => {
      if (line.includes("http")) {
        try {
          const url = new URL(line.trim());
          newConfig.hostname = url.hostname;
          newConfig.port = url.port || "80";
          const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
          newConfig.contextPath = pathSegments.length > 0 ? pathSegments[0] : '';
        } catch (error) {
          console.error("Invalid URL in import text:", error);
          toast.error("Invalid URL detected. Please check the input.");
        }
      } else if (line.toLowerCase().startsWith("mac-")) {
        newConfig.mac = line.substring(line.indexOf("-") + 1).trim();
      } else if (line.toLowerCase().startsWith("sn-")) {
        newConfig.serialNumber = line.substring(line.indexOf("-") + 1).trim();
      } else if (line.toLowerCase().startsWith("device id 1&2-")) {
        const deviceIds = line.substring(line.indexOf("-") + 1).trim();
        // Assuming deviceId1 and deviceId2 are the same if only one is provided
        newConfig.deviceId1 = deviceIds;
        newConfig.deviceId2 = deviceIds;
      }
    });

    setConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
    toast.success("Configuration imported successfully!");
    handleModalClose();
  };

  const loadGroups = async () => {
    try {
      const response = await api.get("/v2/groups");
      const data = response.data;
      setGroups(data);
    } catch {
      toast.error("Error loading groups");
    }
  };

  const loadConfig = async () => {
    try {
      const response = await api.get("/config");
      const data = response.data;
      setConfig((prev) => ({
        ...prev,
        ...data,
        groups: Array.isArray(data.groups) ? data.groups : [],
        proxy: !!data.proxy,
        tokens: Array.isArray(data.tokens) ? data.tokens : [],
      }));
    } catch {
      toast.error("Error loading configuration");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));
  };

  const handleGroupsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setConfig((prev) => ({
      ...prev,
      groups: selected,
    }));
  };

  type SubmitEvent = React.FormEvent<HTMLFormElement>

  interface ConfigUpdateResponse {
    message?: string;
    [key: string]: string | undefined;
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    try {
      const response = await api.post<ConfigUpdateResponse>("/config", config);
      const result = response.data;
      toast.success(result.message || "Configuration updated successfully");
    } catch {
      toast.error("Error updating configuration");
    }
  };

  const handleReloadGroups = async () => {
    try {
      await api.get("/v2/refresh-groups");
      toast.success("Groups refreshed successfully");
    } catch {
      toast.error("Error refreshing groups");
    }
    await loadGroups();
  };

  const handleRefreshChannels = async () => {
    try {
      await api.get("/v2/refresh-channels");
      toast.success("Channels refreshed successfully");
    } catch {
      toast.error("Error refreshing channels");
    }
  };

  const handleRefreshMovieGroups = async () => {
    try {
      await api.get("/v2/refresh-movie-groups");
      toast.success("Movie groups refreshed successfully");
    } catch {
      toast.error("Error refreshing movie groups");
    }
  };
  const handleRefreshSeriesGroups = async () => {
    try {
      await api.get("/v2/refresh-series-groups");
      toast.success("Series groups refreshed successfully");
    } catch {
      toast.error("Error refreshing Series groups");
    }
  };

  const handleAddToken = async () => {
    try {
      const response = await api.get("/v2/get-token");
      const newToken = response.data.token;
      if (newToken) {
        setConfig((prev) => ({
          ...prev,
          tokens: [...prev.tokens, newToken],
        }));
        toast.success("Token added successfully");
      } else {
        toast.error("Failed to add token");
      }
    } catch {
      toast.error("Error adding token");
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
      await api.post("/v2/clear-tokens", {});
      toast.success("All tokens cleared");
    } catch {
      toast.error("Error clearing tokens on server");
    }
    setConfig((prev) => ({
      ...prev,
      tokens: [],
    }));
  };

  const handleClearWatched = () => {
    if (window.confirm("Are you sure you want to clear all watched and in-progress statuses?")) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("video-completed-") || key.startsWith("video-in-progress-")) {
          localStorage.removeItem(key);
        }
      });
      toast.success("All watched and in-progress statuses have been cleared.");
    }
  };



  return (
    <div className="font-sans max-w-4xl mx-auto my-5 p-5 text-white bg-gray-800 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Stalker Configuration</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <div className="flex items-end gap-2">
            <div className="grow">
              <label htmlFor="hostname" className="block text-sm font-medium mb-1">
                Hostname:
              </label>
              <input
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
                type="text"
                id="hostname"
                name="hostname"
                value={config.hostname}
                onChange={handleInputChange}
              />
            </div>
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors h-10"
              onClick={handleImportClick}
            >
              Import from Text
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="port" className="block text-sm font-medium mb-1">
            Port:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="number"
            id="port"
            name="port"
            value={config.port}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="contextPath" className="block text-sm font-medium mb-1">
            Context Path:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="text"
            id="contextPath"
            name="contextPath"
            value={config.contextPath}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="mac" className="block text-sm font-medium mb-1">
            MAC:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="text"
            id="mac"
            name="mac"
            value={config.mac}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="deviceId1" className="block text-sm font-medium mb-1">
            Device ID 1:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="text"
            id="deviceId1"
            name="deviceId1"
            value={config.deviceId1}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="deviceId2" className="block text-sm font-medium mb-1">
            Device ID 2:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="text"
            id="deviceId2"
            name="deviceId2"
            value={config.deviceId2}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="serialNumber" className="block text-sm font-medium mb-1">
            Serial Number:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="text"
            id="serialNumber"
            name="serialNumber"
            value={config.serialNumber}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="stbType" className="block text-sm font-medium mb-1">
            STB Type:
          </label>
          <input
            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            type="text"
            id="stbType"
            name="stbType"
            value={config.stbType}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="groups" className="block text-sm font-medium mb-1">
            Groups:
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <select
                id="groups"
                name="groups"
                multiple
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500 h-40"
                value={config.groups}
                onChange={handleGroupsChange}
              >
                {groups.map((group) => (
                  <option key={group.title} value={group.title}>
                    {group.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors h-10"
                onClick={handleReloadGroups}
              >
                🔄 Reload Groups
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors h-10"
                onClick={handleRefreshChannels}
              >
                🔄 Refresh Channels
              </button>
              <button
                type="button"
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors h-10"
                onClick={handleRefreshMovieGroups}
              >
                🎬 Refresh Movie Groups
              </button>
              <button
                type="button"
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors h-10"
                onClick={handleRefreshSeriesGroups}
              >
                🎬 Refresh Series Groups
              </button>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Hold Ctrl (Windows) or Command (Mac) to select multiple groups
            </div>
            <div className="text-sm text-gray-400 mt-1 md:hidden">
              Tap multiple groups to select them
            </div>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <input
              className="w-auto h-5"
              type="checkbox"
              id="proxy"
              name="proxy"
              checked={config.proxy}
              onChange={handleInputChange}
            />
            <label htmlFor="proxy" className="text-white">Use Proxy</label>
          </div>
        </div>

        {/* Token Keys Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Token Keys:</label>
          <div className="flex flex-col gap-2">
            <ul className="list-none pl-0 mt-2">
              {config.tokens.map((token, index) => (
                <li key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg mb-2">
                  <span className="break-all text-gray-300">{token}</span>
                  <button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded-lg"
                    onClick={() => handleDeleteToken(index)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                onClick={handleAddToken}
              >
                + Add Token
              </button>
              <button
                type="button"
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                onClick={handleClearTokens}
                disabled={config.tokens.length === 0}
              >
                Clear All Tokens
              </button>
              <button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                onClick={handleClearWatched}
              >
                Clear All Watched
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full">
          Save Configuration
        </button>
        {/* <button
          type="button"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full mt-2"
          onClick={handleImportClick}
        >
          Import from Text
        </button> */}
      </form>

      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">Import Configuration from Text</h2>
            <textarea
              className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white h-40 resize-none focus:outline-none focus:border-blue-500"
              placeholder="Paste your configuration text here (URL, MAC, SN, Device IDs)"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            ></textarea>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                onClick={handleParseAndApply}
              >
                Parse and Apply
              </button>
              <button
                type="button"
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                onClick={handleModalClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
