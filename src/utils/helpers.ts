export const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const paddedSeconds = seconds.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
};

export const isTizenDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Check specifically for mock query param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mock_tizen') === 'true') {
    console.log("Enabling Tizen Mock mode via URL param");
    return true;
  }

  return !!(window as any).tizen;
};
