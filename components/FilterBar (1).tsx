
import React, { useState, useRef, useEffect } from 'react';
import type { Filters } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SearchIcon } from './icons/SearchIcon';

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onClearFilters: () => void;
  sources: string[];
  statuses: string[];
  originalStatuses: string[];
  onOpenPicker: (type: 'arrival' | 'departure') => void;
  statusLabel?: string;
  originalStatusLabel?: string;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

interface SearchableDropdownProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    allLabel?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ 
    label, 
    options, 
    value, 
    onChange, 
    placeholder = "Seleccionar...",
    allLabel = "Todos"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-brand-300 mb-1">{label}</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-3 bg-brand-800 border border-brand-700 text-white rounded-md shadow-sm hover:bg-brand-700/50 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 flex items-center justify-between cursor-pointer transition-colors"
            >
                <span className={`block truncate ${!value ? 'text-brand-300' : ''}`}>
                    {value || allLabel}
                </span>
                <ChevronDownIcon className="w-5 h-5 text-brand-400" />
            </div>

            {isOpen && (
                <div className="absolute z-20 mt-1 w-full bg-brand-800 border border-brand-600 rounded-md shadow-2xl max-h-60 overflow-hidden flex flex-col animate-fade-in">
                    <div className="p-2 border-b border-brand-700 sticky top-0 bg-brand-800">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="w-full bg-brand-900 border border-brand-600 text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-brand-400 placeholder-brand-500"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-brand-600 scrollbar-track-brand-900">
                        <div
                            className={`px-4 py-2 hover:bg-brand-700 cursor-pointer text-sm ${value === '' ? 'bg-brand-700/50 text-brand-100' : 'text-brand-200'}`}
                            onClick={() => handleSelect('')}
                        >
                            {allLabel}
                        </div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option}
                                    className={`px-4 py-2 hover:bg-brand-700 cursor-pointer text-sm ${value === option ? 'bg-brand-600 text-white font-medium' : 'text-brand-200'}`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-sm text-brand-400 italic">No se encontraron resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const FilterBar: React.FC<FilterBarProps> = ({ 
    filters, 
    onFilterChange, 
    onClearFilters, 
    sources, 
    statuses, 
    originalStatuses, 
    onOpenPicker,
    statusLabel = "Estado de la Habitacion",
    originalStatusLabel = "Estado Ciudad"
}) => {

  const renderDateDisplay = (start: string, end: string) => {
    if (!start && !end) return <span className="text-brand-300">Cualquier fecha</span>;
    if (start && !end) return formatDate(start);
    if (!start && end) return `Hasta ${formatDate(end)}`;
    if (start === end) return formatDate(start);
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Buscador de Reserva */}
        <div>
            <label className="block text-sm font-medium text-brand-300 mb-1">Buscar Reserva</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-brand-400" />
                </div>
                <input
                    type="text"
                    className="w-full h-10 pl-9 pr-3 bg-brand-800 border border-brand-700 text-white rounded-md shadow-sm hover:bg-brand-700/50 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors placeholder-brand-500 text-sm focus:outline-none"
                    placeholder="No. Reserva..."
                    value={filters.reservationSearch || ''}
                    onChange={(e) => onFilterChange({ ...filters, reservationSearch: e.target.value })}
                />
            </div>
        </div>

        {/* Fuente */}
        <SearchableDropdown 
            label="Fuente"
            options={sources}
            value={filters.source}
            onChange={(val) => onFilterChange({ ...filters, source: val })}
            allLabel="Todas las fuentes"
        />

        {/* Estado Original (Dynamic Label) */}
         <SearchableDropdown 
            label={originalStatusLabel}
            options={originalStatuses}
            value={filters.originalStatus}
            onChange={(val) => onFilterChange({ ...filters, originalStatus: val })}
            allLabel="Todos los estados"
        />

        {/* Estado de la Reserva (Dynamic Label) */}
        <SearchableDropdown 
            label={statusLabel}
            options={statuses}
            value={filters.status}
            onChange={(val) => onFilterChange({ ...filters, status: val })}
            allLabel="Todos los estados"
        />

        {/* Fechas de Llegada */}
        <div>
            <label className="block text-sm font-medium text-brand-300 mb-1">Fecha de llegada</label>
            <button 
                onClick={() => onOpenPicker('arrival')}
                className="w-full h-10 px-3 text-left bg-brand-800 border-brand-700 text-white rounded-md shadow-sm hover:bg-brand-700/50 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 flex items-center justify-between transition-colors"
            >
                <span className="flex items-center gap-2 truncate">
                    <CalendarIcon className="w-5 h-5 text-brand-300 flex-shrink-0" />
                    <span className="truncate">{renderDateDisplay(filters.arrivalDateStart, filters.arrivalDateEnd)}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 text-brand-300 flex-shrink-0" />
            </button>
        </div>
        
        {/* Fechas de Salida */}
        <div>
            <label className="block text-sm font-medium text-brand-300 mb-1">Salida</label>
            <button 
                onClick={() => onOpenPicker('departure')}
                className="w-full h-10 px-3 text-left bg-brand-800 border-brand-700 text-white rounded-md shadow-sm hover:bg-brand-700/50 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 flex items-center justify-between transition-colors"
            >
                <span className="flex items-center gap-2 truncate">
                    <CalendarIcon className="w-5 h-5 text-brand-300 flex-shrink-0" />
                    <span className="truncate">{renderDateDisplay(filters.departureDateStart, filters.departureDateEnd)}</span>
                </span>
                <ChevronDownIcon className="w-4 h-4 text-brand-300 flex-shrink-0" />
            </button>
        </div>
      </div>
      <div className="flex justify-end">
          <button
            onClick={onClearFilters}
            className="px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors duration-300 shadow-md"
          >
            Limpiar Filtros
          </button>
        </div>
    </div>
  );
};
