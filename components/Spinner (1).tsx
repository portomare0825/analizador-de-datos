import React from 'react';

interface SpinnerProps {
    current?: number;
    total?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ current, total }) => {
    const messages = [
        "Cargando registros...",
        "Preparando la auditoría...",
        "Sincronizando con la base de datos...",
        "Organizando información...",
        "Esto puede tomar un momento..."
    ];
    const [message, setMessage] = React.useState(messages[0]);

    React.useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(messages[Math.floor(Math.random() * messages.length)]);
        }, 2500);

        return () => clearInterval(intervalId);
    }, []);

    const hasProgress = total !== undefined && total > 0;
    const percentage = hasProgress ? Math.round((current || 0) / total * 100) : 0;

    return (
        <div className="flex flex-col items-center justify-center space-y-6 p-8 animate-fade-in">
            <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-500"></div>
                {hasProgress && (
                    <div className="absolute text-xs font-bold text-brand-300">
                        {percentage}%
                    </div>
                )}
            </div>
            <div className="text-center space-y-2">
                <p className="text-lg text-brand-200 font-medium transition-opacity duration-500">{message}</p>
                {hasProgress && (
                    <p className="text-sm text-brand-400">
                        {current?.toLocaleString()} de {total?.toLocaleString()} registros cargados
                    </p>
                )}
            </div>
        </div>
    );
};