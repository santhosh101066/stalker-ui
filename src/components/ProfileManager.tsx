/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/api';

type ConfigProfile = {
  id: number;
  name: string;
  description?: string;
  config: {
    hostname: string;
    port: string | number;
    contextPath: string;
    mac: string;
    deviceId1?: string;
    deviceId2?: string;
    serialNumber?: string;
    stbType: string;
    groups: string[];
    proxy: boolean;
    tokens: string[];
    playCensored: boolean;
    providerType?: 'stalker' | 'xtream';
    username?: string;
    password?: string;
  };
  isActive: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const ProfileManager = () => {
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [newProfileProviderType, setNewProfileProviderType] = useState<'stalker' | 'xtream'>('stalker');
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await api.get<ConfigProfile[]>('/profiles');
      setProfiles(response.data);
    } catch (error) {
      toast.error('Failed to load profiles');
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateProfile = async (profileId: number) => {
    if (
      !window.confirm(
        'Activating this profile will restart the server. Continue?'
      )
    ) {
      return;
    }

    try {
      await api.post(`/profiles/${profileId}/activate`);
      toast.success('Profile activated! Server is restarting...');
      setTimeout(() => {
        loadProfiles();
      }, 2000);
    } catch (error) {
      toast.error('Failed to activate profile');
      console.error('Error activating profile:', error);
    }
  };

  const handleToggleEnabled = async (profile: ConfigProfile) => {
    const endpoint = profile.isEnabled ? 'disable' : 'enable';
    try {
      await api.post(`/profiles/${profile.id}/${endpoint}`);
      toast.success(`Profile ${profile.isEnabled ? 'disabled' : 'enabled'}`);
      loadProfiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
      console.error('Error toggling profile:', error);
    }
  };

  const handleDeleteProfile = async (profile: ConfigProfile) => {
    if (!window.confirm(`Are you sure you want to delete "${profile.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/profiles/${profile.id}`);
      toast.success('Profile deleted');
      loadProfiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete profile');
      console.error('Error deleting profile:', error);
    }
  };

  const handleCreateProfile = async () => {
    // Fix: Trim whitespace to prevent "Name " duplicates
    const safeName = newProfileName.trim();

    if (!safeName) {
      toast.error('Profile name is required');
      return;
    }

    try {
      const configResponse = await api.get('/config');
      const currentConfig = configResponse.data;

      // Override with new fields if set
      const newConfig = {
        ...currentConfig,
        providerType: newProfileProviderType,
        username: newProfileProviderType === 'xtream' ? newProfileUsername : currentConfig.username,
        password: newProfileProviderType === 'xtream' ? newProfilePassword : currentConfig.password,
      };

      await api.post('/profiles', {
        name: safeName,
        description: newProfileDescription,
        config: newConfig,
      });
      toast.success('Profile created successfully');
      setShowCreateModal(false);
      setNewProfileName('');
      setNewProfileDescription('');
      setNewProfileProviderType('stalker');
      setNewProfileUsername('');
      setNewProfilePassword('');
      loadProfiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create profile');
    }
  };

  const handleDuplicateProfile = async (profile: ConfigProfile) => {
    const rawName = prompt(
      `Enter name for duplicated profile:`,
      `${profile.name} (Copy)`
    );
    if (!rawName) return;

    // Fix: Trim whitespace here too
    const safeName = rawName.trim();
    if (!safeName) return;

    try {
      await api.post('/profiles', {
        name: safeName,
        description: profile.description,
        config: profile.config,
      });
      toast.success('Profile duplicated successfully');
      loadProfiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to duplicate profile');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto my-5 max-w-6xl rounded-lg bg-gray-800 p-5 text-center text-white">
        <div className="text-lg">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="font-sans text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profiles</h2>
          <p className="text-sm text-gray-400">
            Manage your different server configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700"
        >
          <span>+</span> New Profile
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`relative flex flex-col justify-between rounded-xl border p-5 shadow-lg transition-all ${profile.isActive
              ? 'border-green-500 bg-gray-800 ring-1 ring-green-500/50'
              : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
              } ${!profile.isEnabled ? 'opacity-75' : ''}`}
          >
            <div>
              <div className="flex items-start justify-between">
                <h3 className="truncate text-lg font-bold text-white">
                  {profile.name}
                </h3>
                {profile.isActive && (
                  <span className="shrink-0 rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 min-h-[2.5em] text-sm text-gray-400">
                {profile.description || 'No description provided.'}
              </p>

              {/* Mini Info Pills */}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-gray-700 px-2 py-1 text-gray-300">
                  Type:{' '}
                  <span className="text-blue-400 uppercase">
                    {profile.config.providerType || 'stalker'}
                  </span>
                </span>
                <span className="rounded bg-gray-700 px-2 py-1 text-gray-300">
                  Host:{' '}
                  <span className="text-blue-400">
                    {profile.config.hostname}
                  </span>
                </span>
                <span className="rounded bg-gray-700 px-2 py-1 text-gray-300">
                  Groups:{' '}
                  <span className="text-blue-400">
                    {profile.config.groups.length}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-700 pt-4">
              {!profile.isActive && (
                <>
                  <button
                    onClick={() => handleActivateProfile(profile.id)}
                    disabled={!profile.isEnabled}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(profile)}
                    className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600/40"
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={() => handleToggleEnabled(profile)}
                disabled={profile.isActive}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${profile.isActive
                  ? 'invisible'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                {profile.isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleDuplicateProfile(profile)}
                className="rounded-lg bg-blue-600/20 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-600/40"
              >
                Clone
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal (Same logic, better styling) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-white">
              Create Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Bedroom STB"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  Description
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  value={newProfileDescription}
                  onChange={(e) => setNewProfileDescription(e.target.value)}
                />
              </div>

              {/* Provider Type Selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  Provider Type
                </label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="newProfileProviderType"
                      value="stalker"
                      checked={newProfileProviderType === 'stalker'}
                      onChange={() => setNewProfileProviderType('stalker')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-white">Stalker</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="newProfileProviderType"
                      value="xtream"
                      checked={newProfileProviderType === 'xtream'}
                      onChange={() => setNewProfileProviderType('xtream')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-white">Xtream Codes</span>
                  </label>
                </div>
              </div>

              {/* Xtream Credentials (Conditional) */}
              {newProfileProviderType === 'xtream' && (
                <div className="space-y-3 rounded bg-gray-800/50 p-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">
                      Username
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      value={newProfileUsername}
                      onChange={(e) => setNewProfileUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">
                      Password
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      value={newProfilePassword}
                      onChange={(e) => setNewProfilePassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="rounded bg-blue-900/20 p-3 text-xs text-blue-200">
                This profile will inherit other settings from your current configuration.
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProfile}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;
