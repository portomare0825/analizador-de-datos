import React, { createContext, useContext, useState, useEffect } from 'react';

type Hotel = 'plus' | 'palm';

interface HotelContextType {
    hotel: Hotel;
    setHotel: (hotel: Hotel) => void;
    getTableName: (prefix: string) => string;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Leer del localStorage al iniciar (persistencia)
    const [hotel, setHotelState] = useState<Hotel>(() => {
        const saved = localStorage.getItem('selectedHotel');
        return (saved === 'palm' || saved === 'plus') ? saved : 'plus';
    });

    // Guardar en localStorage cuando cambie
    useEffect(() => {
        localStorage.setItem('selectedHotel', hotel);
    }, [hotel]);

    const setHotel = (newHotel: Hotel) => {
        setHotelState(newHotel);
    };

    const getTableName = (prefix: string) => {
        return `${prefix}_${hotel}`;
    };

    return (
        <HotelContext.Provider value={{ hotel, setHotel, getTableName }}>
            {children}
        </HotelContext.Provider>
    );
};

export const useHotel = () => {
    const context = useContext(HotelContext);
    if (context === undefined) {
        throw new Error('useHotel must be used within a HotelProvider');
    }
    return context;
};
