
import React, { useState, useRef, useEffect } from 'react';
import { ColumnsIcon } from './icons/ColumnsIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ColumnSelectorProps {
    allColumns: string[];
    selectedColumns: string[];
    onSelectionChange: (selected: string[]) => void;
    originalHeaderMap?: Record<string, string> | null;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({ allColumns, selectedColumns, onSelectionChange, originalHeaderMap }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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
    
    const handleToggleColumn = (column: string) => {
        const currentIndex = selectedColumns.indexOf(column);
        let newSelected = [...selectedColumns];

        if (currentIndex === -1) {
            newSelected.push(column);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        // Maintain original column order
        const orderedSelection = allColumns.filter(c => newSelected.includes(c));
        onSelectionChange(orderedSelection);
    };

    const handleSelectAll = () => onSelectionChange(allColumns);
    const handleDeselectAll = () => onSelectionChange([]);
    
    const isAllSelected = allColumns.length > 0 && selectedColumns.length === allColumns.length;

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex items-center justify-center rounded-md border border-brand-700 shadow-sm px-4 py-2 bg-brand-800 text-sm font-medium text-brand-200 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-900 focus:ring-brand-500"
                    id="options-menu"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                >
                    <ColumnsIcon className="mr-2 h-5 w-5" />
                    Seleccionar Columnas ({selectedColumns.length}/{allColumns.length})
                    <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-left absolute left-0 mt-2 w-72 rounded-md shadow-lg bg-brand-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 animate-fade-in"
                    style={{ animationDuration: '150ms' }}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                >
                    <div className="p-2">
                        <div className="flex justify-between items-center mb-2">
                            <button onClick={handleSelectAll} disabled={isAllSelected} className="text-xs px-2 py-1 bg-brand-700 hover:bg-brand-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Todos</button>
                            <button onClick={handleDeselectAll} disabled={selectedColumns.length === 0} className="text-xs px-2 py-1 bg-brand-700 hover:bg-brand-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Ninguno</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-1" role="none">
                            {allColumns.map((column) => {
                                // Display the standardized name (App Key)
                                const displayName = column;
                                // Get original name if available
                                const originalName = originalHeaderMap ? originalHeaderMap[column] : null;
                                const showOriginal = originalName && originalName !== displayName;

                                return (
                                    <label
                                        key={column}
                                        className="flex items-start px-2 py-2 text-sm text-brand-100 rounded-md hover:bg-brand-700 cursor-pointer select-none transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 rounded bg-brand-900 border-brand-600 text-brand-500 focus:ring-brand-500 cursor-pointer shrink-0"
                                            checked={selectedColumns.includes(column)}
                                            onChange={() => handleToggleColumn(column)}
                                        />
                                        <div className="ml-3 flex flex-col">
                                            <span className="font-medium leading-tight text-base">{displayName}</span>
                                            {showOriginal && (
                                                <span className="text-[10px] text-brand-400 opacity-75 break-all leading-tight mt-0.5">{originalName}</span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
