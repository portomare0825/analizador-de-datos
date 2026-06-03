import React from 'react';
import type { SummaryData } from '../types';

interface SummaryDisplayProps {
  data: SummaryData;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6 animate-fade-in">
      <div className="bg-brand-800/50 p-4 rounded-lg text-center border border-brand-700">
        <p className="text-sm text-brand-300">Total de Reservas</p>
        <p className="text-2xl font-bold text-white">{data.recordCount}</p>
      </div>
      <div className="bg-brand-800/50 p-4 rounded-lg text-center border border-brand-700">
        <p className="text-sm text-brand-300">Total Adultos</p>
        <p className="text-2xl font-bold text-white">{data.totalAdults}</p>
      </div>
      <div className="bg-brand-800/50 p-4 rounded-lg text-center border border-brand-700">
        <p className="text-sm text-brand-300">Total Niños</p>
        <p className="text-2xl font-bold text-white">{data.totalChildren}</p>
      </div>
      <div className="bg-brand-800/50 p-4 rounded-lg text-center border border-brand-700">
        <p className="text-sm text-brand-300">Total de Habitaciones</p>
        <p className="text-2xl font-bold text-white">{data.totalRooms}</p>
      </div>
    </div>
  );
};