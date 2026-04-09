import React, { useEffect, useState } from 'react';

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    type?: 'confirm' | 'info' | 'error';
}

export const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    confirmLabel = 'Aceptar',
    cancelLabel = 'Cancelar',
    onConfirm,
    type = 'confirm'
}) => {
    const [animation, setAnimation] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimation(true);
            document.body.style.overflow = 'hidden';
        } else {
            setAnimation(false);
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${animation ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop con blur profundo */}
            <div
                className="absolute inset-0 bg-brand-950/60 backdrop-blur-md"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className={`relative w-full max-w-md bg-brand-900/40 backdrop-blur-2xl border border-brand-800 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-300 transform ${animation ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}>

                {/* Header decorativo opcional */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-900 border border-brand-800 p-3 rounded-2xl shadow-xl">
                    {type === 'confirm' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                        </svg>
                    ) : type === 'error' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-emerald-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.835a.5.5 0 0 0 .106.453l.06.07a.5.5 0 0 0 .574.059l.27-.135M12 7.5h.008v.008H12V7.5Z" />
                        </svg>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 text-brand-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mt-4">
                    <h3 className="text-xl font-black text-white mb-2 tracking-tight uppercase">{title}</h3>
                    <p className="text-brand-300 font-medium leading-relaxed">{message}</p>
                </div>

                <div className="flex gap-3 mt-8">
                    {type === 'confirm' && (
                        <button
                            onClick={onClose}
                            className="flex-1 bg-brand-800/50 hover:bg-brand-800 text-brand-300 font-bold py-3 px-6 rounded-2xl border border-brand-700 transition-all active:scale-95"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 font-bold py-3 px-6 rounded-2xl transition-all active:scale-95 shadow-lg
                            ${type === 'error' ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-gradient-to-r from-brand-500 to-emerald-600 text-white shadow-brand-500/20'}
                        `}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
