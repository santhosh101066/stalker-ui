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
  'admin_token'
];

Storage.prototype.getItem = function(key: string) {
  if (ignoredKeys.includes(key)) {
    return originalGetItem.call(this, key);
  }
  const prefix = getPrefix();
  return originalGetItem.call(this, prefix + key);
};

Storage.prototype.setItem = function(key: string, value: string) {
  if (ignoredKeys.includes(key)) {
    return originalSetItem.call(this, key, value);
  }
  const prefix = getPrefix();
  return originalSetItem.call(this, prefix + key, value);
};

Storage.prototype.removeItem = function(key: string) {
  if (ignoredKeys.includes(key)) {
    return originalRemoveItem.call(this, key);
  }
  const prefix = getPrefix();
  return originalRemoveItem.call(this, prefix + key);
};
