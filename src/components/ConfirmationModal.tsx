import React from 'react';

type ConfirmationModalProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
};

const ConfirmationModal: React.FC<ConfirmationModalProps & {
    showInput?: boolean;
    inputValue?: string;
    inputPlaceholder?: string;
    onInputChange?: (val: string) => void;
}> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false,
    showInput = false,
    inputValue = '',
    inputPlaceholder = '',
    onInputChange,
}) => {
        if (!isOpen) return null;

        // Handle Enter key for submission
        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                onConfirm();
            } else if (e.key === 'Escape') {
                onCancel();
            }
        };

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                <div
                    className="w-full max-w-md scale-100 rounded-2xl border border-gray-700/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur-md animate-scale-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    onKeyDown={handleKeyDown}
                >
                    <h3 id="modal-title" className="mb-2 text-xl font-bold text-white">
                        {title}
                    </h3>
                    <p className="mb-6 text-gray-300">
                        {message}
                    </p>

                    {showInput && (
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => onInputChange?.(e.target.value)}
                            placeholder={inputPlaceholder}
                            data-focusable="true"
                            autoFocus
                            className="mb-6 w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            data-focusable="true"
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:bg-white/10 hover:text-white transition-colors focus:bg-white/10 focus:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            data-focusable="true"
                            className={`rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 ${isDestructive
                                ? 'bg-red-600 shadow-red-900/20 hover:bg-red-500 focus:ring-red-500'
                                : 'bg-blue-600 shadow-blue-900/20 hover:bg-blue-500 focus:ring-blue-500'
                                }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

export default ConfirmationModal;
