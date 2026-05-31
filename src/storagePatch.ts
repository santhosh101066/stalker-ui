/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/services/api';

const originalGetItem = Storage.prototype.getItem;
const originalSetItem = Storage.prototype.setItem;
const originalRemoveItem = Storage.prototype.removeItem;

const getPrefix = () => {
  try {
    const hash = originalGetItem.call(localStorage, 'config_hash');
    return hash ? `${hash}_` : '';
  } catch {
    return '';
  }
};

const ignoredKeys = [
  'device_id',
  'config_hash',
  'PREFERRED_CONTENT_TYPE',
  'admin_token',
  'auth_token',
  'refresh_token',
  'auth_user',
];

interface CustomWindow extends Window {
  __isSyncingFromServer?: boolean;
}

const syncTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const lastSyncTimes = new Map<string, number>();
const SYNC_INTERVAL_MS = 10000;

async function syncToBackend(key: string, value: string | null) {
  // Prevent sync loops when application state updates are triggered from server payloads
  if ((window as CustomWindow).__isSyncingFromServer) return;

  // Making sure user has valid auth layer active before hitting endpoints
  const token = originalGetItem.call(localStorage, 'auth_token');
  if (!token) return;

  try {
    // 1. Playback Progress Sync (WITH THROTTLING & META OBJECT TRANSMISSION)
    if (key.includes('video-in-progress-')) {
      if (value) {
        const data = JSON.parse(value);
        const mediaId = data.mediaId || data.id;
        const progress = data.currentTime || 0;
        
        if (mediaId) {
          const now = Date.now();
          const lastSync = lastSyncTimes.get(key) || 0;
          const timeSinceLastSync = now - lastSync;

          const executeFetch = () => {
            // Replaced manual domain building with centralized API router context
            api.put('/user/progress', {
              mediaId: String(mediaId),
              progress: Number(progress),
              completed: false,
              meta: data // Complete mirror storage object payload
            }).catch(err => console.error('Progress API sync error:', err));
            
            lastSyncTimes.set(key, Date.now());
            syncTimeouts.delete(key);
          };

          if (syncTimeouts.has(key)) {
            clearTimeout(syncTimeouts.get(key));
          }

          if (timeSinceLastSync >= SYNC_INTERVAL_MS) {
            executeFetch();
          } else {
            const timeoutId = setTimeout(executeFetch, SYNC_INTERVAL_MS - timeSinceLastSync);
            syncTimeouts.set(key, timeoutId);
          }
        }
      }
    } 
    // 1.b Playback Completed Sync
    else if (key.includes('video-completed-')) {
      if (value) {
        const data = JSON.parse(value);
        const mediaId = data.mediaId;
        if (mediaId) {
          const inProgressKey = `video-in-progress-${mediaId}`;
          if (syncTimeouts.has(inProgressKey)) {
            clearTimeout(syncTimeouts.get(inProgressKey));
            syncTimeouts.delete(inProgressKey);
          }
          
          api.put('/user/progress', {
            mediaId: String(mediaId),
            progress: 0,
            completed: true,
            meta: data
          }).catch(err => console.error('Progress complete API sync error:', err));
        }
      }
    } 
    // 1.c Watch History Removal/Clear Interceptor Trigger
    else if (key.includes('clear-history-trigger')) {
      // Direct action when custom history trigger value changes to dispatch clean request
      api.post('/user/clear-history')
         .catch(err => console.error('Clear history API sync error:', err));
    }
    // 2. Preferences & Settings Sync (Routing through application network instance)
    else if (key === 'favorite_channels') {
      const favorites = value ? JSON.parse(value) : [];
      api.put('/user/preferences', { favorites }).catch(e => console.error(e));
    } else if (key === 'recent_channels') {
      const recentChannels = value ? JSON.parse(value) : [];
      api.put('/user/preferences', { recentChannels }).catch(e => console.error(e));
    } else if (key === 'preferredContentType') {
      api.put('/user/preferences', { preferredContentType: value }).catch(e => console.error(e));
    } else if (key === 'videoFitMode') {
      api.put('/user/preferences', { videoFitMode: value }).catch(e => console.error(e));
    } else if (key.startsWith('last_selected_category_title_')) {
      const type = key.replace('last_selected_category_title_', '');
      api.put('/user/preferences', {
        lastSelectedCategoryTitle: { [type]: value || '' }
      }).catch(e => console.error(e));
    } else if (key.startsWith('last_selected_category_')) {
      const type = key.replace('last_selected_category_', '');
      api.put('/user/preferences', {
        lastSelectedCategory: { [type]: value || '' }
      }).catch(e => console.error(e));
    }
  } catch (err) {
    console.error('Error in syncToBackend pipeline:', err);
  }
}

Storage.prototype.getItem = function (key: string) {
  if (ignoredKeys.includes(key)) {
    return originalGetItem.call(this, key);
  }
  const prefix = getPrefix();
  return originalGetItem.call(this, prefix + key);
};

Storage.prototype.setItem = function (key: string, value: string) {
  if (ignoredKeys.includes(key)) {
    const result = originalSetItem.call(this, key, value);
    if (['preferredContentType', 'videoFitMode'].includes(key)) {
      syncToBackend(key, value);
    }
    return result;
  }
  const prefix = getPrefix();
  const result = originalSetItem.call(this, prefix + key, value);
  syncToBackend(key, value);
  return result;
};

Storage.prototype.removeItem = function (key: string) {
  if (ignoredKeys.includes(key)) {
    return originalRemoveItem.call(this, key);
  }
  const prefix = getPrefix();
  const result = originalRemoveItem.call(this, prefix + key);
  syncToBackend(key, null);
  return result;
};