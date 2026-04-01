export const getStorageKey = (key: string) => {
  if (['device_id', 'config_hash', 'config', 'admin_token'].includes(key)) return key;
  const hash = localStorage.getItem('config_hash');
  return hash ? `${hash}_${key}` : key;
};

export const storage = {
  getItem: (key: string) => localStorage.getItem(getStorageKey(key)),
  setItem: (key: string, value: string) => localStorage.setItem(getStorageKey(key), value),
  removeItem: (key: string) => localStorage.removeItem(getStorageKey(key)),
  clearWatched: () => {
    const hash = localStorage.getItem('config_hash') || '';
    Object.keys(localStorage).forEach((k) => {
      if (k.includes('video-in-progress') || k.includes('video-completed')) {
        if (!hash || k.startsWith(hash)) {
          localStorage.removeItem(k);
        }
      }
    });
  }
};
