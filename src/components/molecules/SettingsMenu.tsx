import React from 'react';
import { useVideoContext } from '@/context/video';
import {
  useVideoQualityOptions,
  useAudioOptions,
  useCaptionOptions,
  GoogleCastButton,
} from '@vidstack/react';
import { ChevronRightIcon, CheckIcon, ChevronLeftIcon, X } from 'lucide-react';
import { FaChromecast } from 'react-icons/fa';

export const SettingsMenu = React.memo(() => {
  const {
    isSettingsMenuOpen,
    activeSettingsMenu,
    setActiveSettingsMenu,
    setIsSettingsMenuOpen,
    settingsMenuRef,
    setFocusedIndex,
    receivers,
    handleCast,
  } = useVideoContext();

  const qualities = useVideoQualityOptions({ auto: true, sort: 'ascending' });
  const audioOptions = useAudioOptions();
  const captionOptions = useCaptionOptions();

  // Close menu on click outside
  React.useEffect(() => {
    if (!isSettingsMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        // Check if the clicked target is the settings button itself to prevent immediate re-opening
        const target = event.target as HTMLElement;
        if (target.closest('[data-control="settings-menu"]') || target.closest('[title="Settings"]')) {
          return;
        }
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isSettingsMenuOpen, setIsSettingsMenuOpen, settingsMenuRef]);

  // Helper function to handle menu changes smoothly
  const handleMenuChange = (
    menuName: 'main' | 'quality' | 'audio' | 'subtitles' | 'cast'
  ) => {
    setActiveSettingsMenu(menuName);
    setFocusedIndex(0);
  };

  if (!isSettingsMenuOpen) return null;

  return (
    <div
      ref={settingsMenuRef}
      className="absolute bottom-[calc(100%+12px)] right-[-10px] z-50 flex w-56 origin-bottom-right flex-col rounded-xl border border-gray-600/40 bg-gray-900/95 p-2 text-base text-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all"
    >
      {/* MAIN MENU */}
      {activeSettingsMenu === 'main' && (
        <div className="flex flex-col space-y-1">
          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('quality')} // 👈 Updated
            className="flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
          >
            <span>Quality</span>
            <div className="flex items-center text-gray-400">
              <span className="mr-1 text-xs">
                {qualities.selectedValue === 'auto'
                  ? 'Auto'
                  : `${qualities.selectedQuality?.height}p`}
              </span>
              <ChevronRightIcon className="h-4 w-4" />
            </div>
          </button>

          {audioOptions.length > 0 && (
            <button
              data-focusable="true"
              data-control="settings-item"
              onClick={() => handleMenuChange('audio')} // 👈 Updated
              className="flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
            >
              <span>Audio</span>
              <div className="flex items-center text-gray-400">
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </button>
          )}

          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('subtitles')} // 👈 Updated
            className="flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
          >
            <span>Captions</span>
            <div className="flex items-center text-gray-400">
              <span className="mr-1 text-xs">
                {captionOptions.selectedValue === 'off' ? 'Off' : 'On'}
              </span>
              <ChevronRightIcon className="h-4 w-4" />
            </div>
          </button>

          <button
            data-focusable="true"
            data-control="settings-close"
            onClick={() => setIsSettingsMenuOpen(false)}
            className="mt-1 flex items-center justify-between rounded border-t border-gray-700/60 px-3 pt-2 pb-1 text-red-400 transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none"
          >
            <span>Close Menu</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* QUALITY SUBMENU */}
      {activeSettingsMenu === 'quality' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')} // 👈 Back ponalum focus reset aagum
            className="mb-2 flex items-center rounded border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>
          {qualities.map(({ label, value, select }) => (
            <button
              key={value}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => {
                select();
                setIsSettingsMenuOpen(false);
                setFocusedIndex(0);
              }}
              className={`flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none ${qualities.selectedValue === value ? 'text-blue-400' : ''}`}
            >
              <span>{label}</span>
              {qualities.selectedValue === value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* AUDIO SUBMENU */}
      {activeSettingsMenu === 'audio' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')}
            className="mb-2 flex items-center rounded border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>
          {audioOptions.map(({ label, value, select }) => (
            <button
              key={value}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => {
                select();
                setIsSettingsMenuOpen(false);
                setFocusedIndex(0);
              }}
              className={`flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none ${audioOptions.selectedValue === value ? 'text-blue-400' : ''}`}
            >
              <span>{label || 'Default'}</span>
              {audioOptions.selectedValue === value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* CAPTIONS SUBMENU */}
      {activeSettingsMenu === 'subtitles' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')} // 👈 Back
            className="mb-2 flex items-center rounded border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>
          {captionOptions.map(({ label, value, select }) => (
            <button
              key={value}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => {
                select();
                setIsSettingsMenuOpen(false);
                setFocusedIndex(0);
              }}
              className={`flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none ${captionOptions.selectedValue === value ? 'text-blue-400' : ''}`}
            >
              <span>{label}</span>
              {captionOptions.selectedValue === value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* CAST SUBMENU */}
      {activeSettingsMenu === 'cast' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <GoogleCastButton
            data-focusable="true"
            data-control="settings-item"
            onClick={() => {
              setIsSettingsMenuOpen(false);
              setFocusedIndex(0);
            }}
            className="flex w-full items-center justify-between rounded px-3 py-2 text-left transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none border-b border-gray-700/40 mb-1 pb-2"
          >
            <div className="flex items-center space-x-2">
              <FaChromecast className="h-4 w-4 text-blue-400" />
              <span>Google Cast (Chromecast)</span>
            </div>
          </GoogleCastButton>

          {receivers && receivers.length > 0 ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            receivers.map((receiver: any) => (
              <button
                key={receiver.id}
                data-focusable="true"
                data-control="settings-item"
                onClick={() => {
                  handleCast(receiver.id);
                  setIsSettingsMenuOpen(false);
                  setFocusedIndex(0);
                }}
                className="flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-none"
              >
                <span>{receiver.name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-center text-sm text-gray-400">
              No other local screen apps found
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SettingsMenu.displayName = 'SettingsMenu';
