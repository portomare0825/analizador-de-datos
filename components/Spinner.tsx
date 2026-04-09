import React from 'react';

export const Spinner: React.FC = () => {
    const messages = [
        "Analizando tus datos...",
        "Generando ideas...",
        "Procesando los números...",
        "Consultando a Gemini...",
        "Descubriendo tendencias...",
        "Esto puede tomar un momento..."
    ];
    const [message, setMessage] = React.useState(messages[0]);

    React.useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(messages[Math.floor(Math.random() * messages.length)]);
        }, 2500);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8 animate-fade-in">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-500"></div>
            <p className="text-lg text-brand-200 font-medium transition-opacity duration-500">{message}</p>
        </div>
    );
};