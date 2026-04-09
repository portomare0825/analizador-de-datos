import React, { useState } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface DateRangePickerProps {
    initialStartDate?: string;
    initialEndDate?: string;
    onApply: (startDate: string, endDate: string) => void;
    onClear: () => void;
    onClose: () => void;
    topOffset?: number;
}

const parseDateString = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        // new Date(year, monthIndex, day) - month is 0-indexed
        const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
};

const formatDateToYyyyMmDd = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};


const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAY_NAMES = ['Dom', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sáb'];

function getWeek(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1)/7);
    return weekNo;
}


export const DateRangePicker: React.FC<DateRangePickerProps> = ({ initialStartDate, initialEndDate, onApply, onClear, onClose, topOffset = 0 }) => {
    const [startDate, setStartDate] = useState<Date | null>(parseDateString(initialStartDate));
    const [endDate, setEndDate] = useState<Date | null>(parseDateString(initialEndDate));
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    
    const initialDisplayDate = parseDateString(initialStartDate) || new Date();
    const [displayDate, setDisplayDate] = useState<Date>(new Date(initialDisplayDate.getFullYear(), initialDisplayDate.getMonth(), 1));

    const handlePrevMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: Date) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day);
            setEndDate(null);
        } else if (startDate && !endDate) {
            if (day < startDate) {
                setStartDate(day);
            } else {
                setEndDate(day);
            }
        }
    };

    const handleApply = () => {
        onApply(formatDateToYyyyMmDd(startDate), formatDateToYyyyMmDd(endDate || startDate));
    };

    const handleClear = () => {
        setStartDate(null);
        setEndDate(null);
        onClear();
    };

    const renderMonth = (date: Date, position: 'left' | 'right') => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const dates: (Date | null)[] = Array(firstDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push(new Date(year, month, i));
        }
        
        const totalSlots = Math.ceil(dates.length / 7) * 7;
        while (dates.length < totalSlots) {
            dates.push(null);
        }

        const weeks: (Date | null)[][] = [];
        for (let i = 0; i < dates.length; i += 7) {
            weeks.push(dates.slice(i, i + 7));
        }

        return (
            <div className="p-2">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={handlePrevMonth} className={`p-1 rounded-full hover:bg-brand-700 ${position === 'right' ? 'invisible' : ''}`} aria-label="Mes anterior">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-center flex-grow">{MONTH_NAMES[month]} {year}</span>
                    <button onClick={handleNextMonth} className={`p-1 rounded-full hover:bg-brand-700 ${position === 'left' ? 'invisible' : ''}`} aria-label="Mes siguiente">
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-y-1 text-center text-xs text-brand-300">
                    <div className="font-semibold mr-1">w</div>
                    {DAY_NAMES.map(day => <div key={day} className="font-semibold">{day}</div>)}
                    
                    {weeks.map((week, weekIndex) => (
                        <React.Fragment key={`week-${weekIndex}`}>
                            <div className="text-brand-400 mr-1 pt-2">{week.find(d => d) ? getWeek(week.find(d => d)!) : ''}</div>
                             {week.map((day, dayIndex) => {
                                if (!day) return <div key={`empty-${weekIndex}-${dayIndex}`}></div>;

                                const isStartDate = startDate && day.getTime() === startDate.getTime();
                                const isEndDate = endDate && day.getTime() === endDate.getTime();
                                const effectiveEndDate = endDate || hoverDate;
                                const isInRange = startDate && effectiveEndDate && day > startDate && day < effectiveEndDate;

                                const dayClasses = [
                                    "w-8 h-8 flex items-center justify-center cursor-pointer transition-colors text-sm",
                                    (isStartDate || isEndDate) ? "bg-brand-600 text-white rounded-full" :
                                    isInRange ? "bg-brand-700/50 text-white" :
                                    !isStartDate && !isEndDate && !isInRange ? "hover:bg-brand-700 rounded-full" : "",
                                    startDate && !endDate && hoverDate && day.getTime() === hoverDate.getTime() && !isStartDate ? "bg-brand-700 rounded-full" : ""
                                ].filter(Boolean).join(" ");
                                
                                const cellClasses = [
                                    "relative",
                                    isStartDate ? "rounded-l-full" : "",
                                    isEndDate || (startDate && !endDate && day.getTime() === hoverDate?.getTime()) ? "rounded-r-full" : "",
                                    isInRange ? "bg-brand-700/50" : ""
                                ].filter(Boolean).join(" ");

                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        className={cellClasses}
                                        onMouseEnter={() => setHoverDate(day)} 
                                        onMouseLeave={() => setHoverDate(null)}
                                        onClick={() => handleDateClick(day)}
                                    >
                                        <button className={dayClasses}>
                                            {day.getDate()}
                                        </button>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    const nextMonthDate = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center bg-brand-950/60 animate-fade-in"
            onClick={onClose}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-brand-900 border text-brand-100 border-brand-800 rounded-lg shadow-2xl animate-fade-in-up p-2 flex flex-col sm:flex-row"
                style={{ marginTop: `${topOffset}px` }}
            >
                <div className="flex border-b sm:border-b-0 sm:border-r border-brand-800 pb-2 mb-2 sm:pb-0 sm:mb-0 sm:pr-2 sm:mr-2">
                    {renderMonth(displayDate, 'left')}
                    <div className="hidden sm:block">
                        {renderMonth(nextMonthDate, 'right')}
                    </div>
                </div>
                <div className="flex flex-col space-y-2 justify-center px-2 w-full sm:w-40">
                    <div>
                        <label className="text-xs text-brand-300">DESDE</label>
                        <input type="text" readOnly value={formatDateForDisplay(startDate)} className="w-full bg-brand-800 border-brand-700 text-white rounded-md p-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-brand-300">HASTA</label>
                        <input type="text" readOnly value={formatDateForDisplay(endDate)} className="w-full bg-brand-800 border-brand-700 text-white rounded-md p-1.5 text-sm" />
                    </div>
                    <button onClick={handleApply} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-4 rounded text-sm">
                        ENVIAR
                    </button>
                    <button onClick={handleClear} className="w-full bg-brand-700 hover:bg-brand-600 text-white font-bold py-2 px-4 rounded text-sm">
                        BORRAR
                    </button>
                </div>
            </div>
        </div>
    );
};