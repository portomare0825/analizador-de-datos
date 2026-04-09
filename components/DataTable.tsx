

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DataRow } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { SaveIcon } from './icons/SaveIcon';
import { CloseIcon } from './icons/CloseIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { fetchNotes, fetchTransactions, copyTransactionsToNotes, fetchAccountNotes, fetchNotesFromView, updateAccountNotesRate, updateNoteRate, deleteAccountNote, saveInvoice, executeDatabaseQuery } from '../services/supabaseService';
import { CalendarIcon } from './icons/CalendarIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { HashtagIcon } from './icons/HashtagIcon';
import { PlusIcon } from './icons/PlusIcon';
import { Snackbar } from './Snackbar';

interface DataTableProps {
    headers: string[];
    data: DataRow[];
    originalHeaderMap?: Record<string, string> | null;
    hideNotes?: boolean; // Prop para ocultar historial de notas
    hideTransactions?: boolean; // Prop para ocultar transacciones
    notesSourceView?: string; // Prop opcional: Si existe, carga notas de esta vista
    useAccountNotes?: boolean; // Nuevo: Si true, carga de notas_de_cuentas (Monto/Tasa)
    onDataChange?: () => void; // Callback para recargar datos tras una acción exitosa
    hotelSource?: string; // Nuevo: "Plus D" o "Palm D" para guardar en la BD
    onEditRow?: (row: DataRow) => void; // New prop for editing
    onDeleteRow?: (row: DataRow) => void; // New prop for deleting
}

interface ManualRow {
    id: string;
    descripcion: string;
    nota: string;
    debito: string;
    credito: string;
    tasa: string;
}

const ROWS_PER_PAGE = 20;

// Helper function moved outside component to be reusable and dependency-free
export const parseCurrency = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;

    let str = String(val).trim();

    // Heuristic to detect format based on last occurrence of . or ,
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');

    let cleanStr = str.replace(/[^0-9.,-]/g, '');

    if (lastComma > lastDot && lastComma > -1) {
        // European style likely: 1.234,56 or 1234,56
        cleanStr = cleanStr.replace(/\./g, '').replace(/,/g, '.');
    } else {
        // US style likely: 1,234.56 or 1234.56
        cleanStr = cleanStr.replace(/,/g, '');
    }

    return parseFloat(cleanStr) || 0;
};

// New formatters per user request
export const formatDateTime = (date: any) => {
    if (!date) return '-';
    let d = date;
    if (!(d instanceof Date)) {
        d = new Date(date);
    }
    if (isNaN(d.getTime())) return String(date);

    // DD-MM-YYYY hh:mm am/pm
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const formatDateDashes = (date: any) => {
    if (!date) return '-';
    let d = date;

    // Si es un string YYYY-MM-DD puro (de Supabase), evitar el desplazamiento de zona horaria
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const [year, month, day] = date.trim().split('-');
        return `${day}-${month}-${year}`;
    }

    if (!(d instanceof Date)) {
        d = new Date(date);
    }
    if (isNaN(d.getTime())) return String(date);
    // DD-MM-YYYY
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

export const formatDecimalUS = (val: any) => {
    const amount = parseCurrency(val);
    // #,##0.00
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

interface SourceDropdownProps {
    options: string[];
    selected: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const SourceDropdown: React.FC<SourceDropdownProps> = ({ options, selected, onChange, placeholder = 'Seleccionar Fuente' }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    React.useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-3 bg-brand-800 border border-brand-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center justify-between transition-colors hover:bg-brand-800/80"
            >
                <span className="truncate">
                    {selected ? selected : placeholder}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-brand-400 ml-2 shadow-sm flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-[10001] mt-1 w-full bg-brand-800 border border-brand-600 rounded-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-60">
                    <div className="p-2 border-b border-brand-700 bg-brand-800 sticky top-0">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar fuente..."
                            className="w-full bg-brand-900 border border-brand-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-brand-400 placeholder-brand-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-brand-600 scrollbar-track-brand-900">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option}
                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${selected === option ? 'bg-brand-600/50 text-white font-medium' : 'text-brand-200 hover:bg-brand-700'}`}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                >
                                    {option}
                                </div>
                            ))
                        ) : searchTerm.trim() !== '' ? (
                            <div 
                                className="px-4 py-3 text-sm text-brand-300 hover:bg-brand-700 cursor-pointer flex items-center gap-2 border-t border-brand-700/50"
                                onClick={() => {
                                    onChange(searchTerm.trim());
                                    setIsOpen(false);
                                }}
                            >
                                <PlusIcon className="w-4 h-4 text-brand-400" />
                                <span>Agregar "<span className="font-bold text-white">{searchTerm}</span>" como nueva fuente</span>
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-brand-500 italic text-center">
                                No hay resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const DataTable: React.FC<DataTableProps> = ({ headers, data, originalHeaderMap, hideNotes = false, hideTransactions = false, notesSourceView, useAccountNotes = false, onDataChange, hotelSource, onEditRow, onDeleteRow }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);
    const lastSelectedRowId = React.useRef<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // State for notes and transactions
    const [notes, setNotes] = useState<any[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [selectedTrxIds, setSelectedTrxIds] = useState<Set<any>>(new Set());
    const [isCopying, setIsCopying] = useState(false);

    // New State for Rate Modal
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [manualRates, setManualRates] = useState<Record<string, string>>({});
    const [accountNotes, setAccountNotes] = useState<any[]>([]);
    const [manualRows, setManualRows] = useState<ManualRow[]>([]); // Estado para filas manuales

    // States for Edit Global Rate Modal
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [tempRate, setTempRate] = useState('');
    const [isUpdatingRate, setIsUpdatingRate] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

    // States for Delete Confirmation
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; noteId: number | null }>({
        isOpen: false,
        noteId: null
    });
    const [isDeletingNote, setIsDeletingNote] = useState(false);

    // States for Invoice Modal
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [invoiceHotel, setInvoiceHotel] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);

    const [viewMode, setViewMode] = useState<'details' | 'notes' | 'transactions'>('details');

    // New State for CxC Modal
    const [isCxCModalOpen, setIsCxCModalOpen] = useState(false);
    const [cxcSource, setCxcSource] = useState('');
    const [cxcType, setCxcType] = useState('cxc'); // 'cxc' o 'intercambio'
    const [uniqueSources, setUniqueSources] = useState<string[]>([]);
    const [isSavingCxC, setIsSavingCxC] = useState(false);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({
        isOpen: false,
        message: '',
        type: 'success'
    });

    const showSnackbar = (message: string, type: 'success' | 'error') => {
        setSnackbar({ isOpen: true, message, type });
    };

    const closeSnackbar = () => {
        setSnackbar(prev => ({ ...prev, isOpen: false }));
    };

    // Reset pagination when data changes (filtering)
    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    // Calculate totals for notes view
    const notesSummary = useMemo(() => {
        let totalDebito = 0;
        let totalCredito = 0;
        let totalMonto = 0; // Para useAccountNotes
        let totalBolivares = 0; // Para useAccountNotes (Monto * Tasa)

        notes.forEach(note => {
            if (useAccountNotes) {
                const m = parseCurrency(note.monto);
                const t = parseCurrency(note.tasa);
                totalMonto += m;
                totalBolivares += m * t;
            } else {
                totalDebito += parseCurrency(note.debito);
                totalCredito += parseCurrency(note.credito);
            }
        });

        return {
            totalDebito,
            totalCredito,
            totalMonto,
            totalBolivares
        };
    }, [notes, useAccountNotes]);

    const transactionsSummary = useMemo(() => {
        let totalDebito = 0;
        let totalCredito = 0;

        // Only calculate totals for SELECTED transactions
        // If nothing selected, return 0 (as per screenshot requirement)
        if (selectedTrxIds.size === 0) {
            return {
                totalDebito: 0,
                totalCredito: 0,
                balance: 0
            };
        }

        transactions.forEach(trx => {
            if (selectedTrxIds.has(trx.id)) {
                totalDebito += parseCurrency(trx.debito);
                totalCredito += parseCurrency(trx.credito);
            }
        });

        return {
            totalDebito,
            totalCredito,
            balance: totalDebito - totalCredito
        };
    }, [transactions, selectedTrxIds]);

    // Totalizar para el Modal de Tasas (Crédito y Bolívares) + Filas Manuales
    const manualRateTotals = useMemo(() => {
        let totalCredito = 0;
        let totalBolivares = 0;
        let totalDebito = 0;

        // 1. Calcular de Transacciones Seleccionadas
        const selectedTrx = transactions.filter(t => selectedTrxIds.has(t.id));

        selectedTrx.forEach(trx => {
            const debito = parseCurrency(trx.debito);
            const credito = parseCurrency(trx.credito); // Usar monto original

            if (debito > 0) totalDebito += debito;

            if (credito > 0) {
                totalCredito += credito;
                const manualRateStr = manualRates[trx.id];
                const manualRate = manualRateStr ? parseFloat(manualRateStr) : 0;
                if (manualRate > 0) {
                    totalBolivares += credito * manualRate;
                }
            }
        });

        // 2. Calcular de Filas Manuales
        manualRows.forEach(row => {
            const debito = parseFloat(row.debito) || 0;
            const credito = parseFloat(row.credito) || 0;
            const tasa = parseFloat(row.tasa) || 0;

            if (debito > 0) totalDebito += debito;

            if (credito > 0) {
                totalCredito += credito;
                if (tasa > 0) {
                    totalBolivares += credito * tasa;
                }
            }
        });

        return { totalCredito, totalBolivares, totalDebito };
    }, [transactions, selectedTrxIds, manualRates, manualRows]);

    // Función extraída para poder llamarla desde el botón de recarga
    const loadRowDetails = async (row: DataRow) => {
        // Intentar encontrar el número de reserva usando varias claves posibles para robustez
        let resNum = row['Numero de la reserva'] || row['Registro Reserva'];

        if (!resNum) {
            // Fallback: Buscar keys que contengan "reserva" y "numero" si la exacta no existe
            const fuzzyKey = Object.keys(row).find(k =>
                k.toLowerCase().includes('reserva') && k.toLowerCase().includes('numero')
            );
            if (fuzzyKey) resNum = row[fuzzyKey];
        }

        // Si faltan datos clave (Nombre, Fuente, Fechas, Totales), intentar recuperarlos de la BD
        // Solo si NO ha sido enriquecida ya (evitar bucle infinito)
        if (resNum && !row._enriched) {
            try {
                const idString = String(resNum).trim();
                // Buscar en ambas posibles tablas (Plus y Palm) para obtener el objeto completo de la reserva
                const queries = [
                    executeDatabaseQuery('reservas', '*', `numero_de_la_reserva=eq.${idString}`, 1),
                    executeDatabaseQuery('reservaspalm', '*', `numero_de_la_reserva=eq.${idString}`, 1)
                ];

                const results = await Promise.allSettled(queries);
                let foundData: any = null;

                results.forEach(res => {
                    if (res.status === 'fulfilled' && res.value && res.value.length > 0) {
                        foundData = res.value[0];
                    }
                });

                if (foundData) {
                    setSelectedRow(prev => {
                        if (!prev) return null;
                        // Mezclar datos existentes con los encontrados para asegurar que el modal tenga todo
                        return {
                            ...prev,      // Datos iniciales de la tabla
                            ...foundData, // SOBRESCRIBIR con la "verdad" de la tabla de reservas
                            'Nombre': prev['Nombre'] || prev['Huesped'] || foundData.nombre,
                            'Fuente': prev['Fuente'] || foundData.fuente,
                            // Asegurar mapeo de nombres de campos para el modal de detalle (usando nombres exactos del JSX)
                            'Fecha de llegada': foundData.fecha_de_llegada,
                            'Salida': foundData.salida,
                            'Total Hab.': foundData.total_hab,
                            'Total General': foundData.total_general,
                            'Numero de la reserva': idString,
                            '_enriched': true
                        };
                    });
                }
            } catch (err) {
                console.error("Error recuperando datos extendidos de reserva:", err);
            }
        }

        // Removed console.log for row selection details

        if (resNum) {
            const idString = String(resNum).trim();

            // Load Notes only if not hidden
            if (!hideNotes) {
                setLoadingNotes(true);

                let fetchPromise;

                if (useAccountNotes) {
                    // Si se activa este flag, buscamos en notas_de_cuentas
                    fetchPromise = fetchAccountNotes(idString);
                } else if (notesSourceView) {
                    // Si hay una vista específica definida
                    fetchPromise = fetchNotesFromView(idString, notesSourceView);
                } else {
                    // Comportamiento por defecto (legacy)
                    fetchPromise = fetchNotes(idString);
                }

                fetchPromise.then(data => {
                    setNotes(data);
                    setLoadingNotes(false);
                }).catch(err => {
                    console.error("Error cargando notas:", err);
                    setNotes([]);
                    setLoadingNotes(false);
                });
            }
            
            // Load Transactions only if not hidden
            if (!hideTransactions) {
                setLoadingTransactions(true);

                // Si tenemos un hotelSource claro, usamos esa tabla
                // Si NO lo tenemos (pestaña CxC), probamos ambas y unimos resultados
                const explicitTable = hotelSource?.toLowerCase().includes('palm')
                    ? 'transacciones_palm'
                    : hotelSource?.toLowerCase().includes('plus')
                        ? 'transacciones_plus'
                        : null;

                if (explicitTable) {
                    fetchTransactions(idString, explicitTable).then(data => {
                        setTransactions(data);
                        setSelectedTrxIds(new Set());
                        setLoadingTransactions(false);
                    }).catch(err => {
                        console.error("Error cargando transacciones:", err);
                        setTransactions([]);
                        setSelectedTrxIds(new Set());
                        setLoadingTransactions(false);
                    });
                } else {
                    // Buscar en AMBAS y unir
                    Promise.allSettled([
                        fetchTransactions(idString, 'transacciones_plus'),
                        fetchTransactions(idString, 'transacciones_palm')
                    ]).then(results => {
                        const combined: any[] = [];
                        results.forEach(res => {
                            if (res.status === 'fulfilled' && res.value) {
                                combined.push(...res.value);
                            }
                        });
                        // Ordenar por fecha cronológicamente
                        combined.sort((a, b) => {
                            const dateA = new Date(a.fecha_hora || a.fecha_servicio || 0).getTime();
                            const dateB = new Date(b.fecha_hora || b.fecha_servicio || 0).getTime();
                            return dateA - dateB;
                        });
                        setTransactions(combined);
                        setSelectedTrxIds(new Set());
                        setLoadingTransactions(false);
                    }).catch(err => {
                        console.error("Error cargando transacciones unificadas:", err);
                        setTransactions([]);
                        setLoadingTransactions(false);
                    });
                }
            }
        } else {
            console.warn("No se encontró un ID de reserva válido en la fila seleccionada.");
            setNotes([]);
            setTransactions([]);
            setSelectedTrxIds(new Set());
            setLoadingNotes(false);
            setLoadingTransactions(false);
        }
    };

    useEffect(() => {
        if (selectedRow) {
            const currentId = String(selectedRow['Numero de la reserva'] || selectedRow['Registro Reserva'] || selectedRow.id);
            
            // Solo resetear el viewMode si es una fila DIFERENTE a la anterior
            if (lastSelectedRowId.current !== currentId) {
                setViewMode('details');
                lastSelectedRowId.current = currentId;
            }

            // Cargar detalles (ahora protegido por el flag _enriched interno)
            loadRowDetails(selectedRow);
        } else {
            lastSelectedRowId.current = null;
            setNotes([]);
            setTransactions([]);
            setSelectedTrxIds(new Set());
            setManualRows([]); // Limpiar filas manuales al cerrar
        }
    }, [selectedRow]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle null/undefined
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                // Date comparison
                if (aValue instanceof Date && bValue instanceof Date) {
                    return sortConfig.direction === 'asc'
                        ? aValue.getTime() - bValue.getTime()
                        : bValue.getTime() - aValue.getTime();
                }
                // Handle mixed Date/String scenario (though unlikely with consistent columns)
                if (aValue instanceof Date) return sortConfig.direction === 'asc' ? 1 : -1;
                if (bValue instanceof Date) return sortConfig.direction === 'asc' ? -1 : 1;

                const strA = String(aValue).trim();
                const strB = String(bValue).trim();

                // Improved Numeric/Currency comparison
                // Allows for currency symbols, negatives, decimals, separators
                const isMoneyOrNumberA = /^[€$£¥\s]*[-]?[\d.,\s]+[€$£¥\s]*$/.test(strA);
                const isMoneyOrNumberB = /^[€$£¥\s]*[-]?[\d.,\s]+[€$£¥\s]*$/.test(strB);

                if (isMoneyOrNumberA && isMoneyOrNumberB) {
                    const aNum = parseCurrency(aValue);
                    const bNum = parseCurrency(bValue);
                    return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                }

                // String comparison
                const stringA = strA.toLowerCase();
                const stringB = strB.toLowerCase();

                if (stringA < stringB) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (stringA > stringB) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const selectedData = sortedData.slice(startIndex, startIndex + ROWS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleRowClick = (row: DataRow) => {
        setSelectedRow(row);
    };

    const handleCloseModal = () => {
        setSelectedRow(null);
    };

    // Formato monetario europeo por defecto para la tabla principal
    const formatMoney = (val: any) => {
        const amount = parseCurrency(val);
        return new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (value: any) => {
        if (!value) return '-';
        let date = value;

        // Si es un string YYYY-MM-DD puro (de Supabase), evitar el desplazamiento de zona horaria
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            const [year, month, day] = value.trim().split('-');
            return `${day}/${month}/${year}`;
        }

        if (!(date instanceof Date)) {
            const str = String(date);
            // Attempt to parse string date if it looks like one
            if (str.includes('T') || str.includes('-') || str.includes('/')) {
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) {
                    date = parsed;
                } else {
                    return str;
                }
            } else {
                return str;
            }
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Pre-calculate values if row is selected
    let roomAmount = 0;
    let totalAmount = 0;
    let diffAmount = 0;

    if (selectedRow) {
        // Mapeo robusto para el monto de habitación
        roomAmount = parseCurrency(
            selectedRow['Total Hab.'] || 
            selectedRow['total_hab'] || 
            selectedRow['Monto Hab.'] ||
            0
        );
        
        // Mapeo robusto para el monto total
        totalAmount = parseCurrency(
            selectedRow['Total General'] || 
            selectedRow['total_general'] || 
            selectedRow['Total'] || 
            selectedRow['Monto Total'] ||
            0
        );

        // Si el total es 0 pero la habitación tiene monto, igualar para que extras sea 0
        if (totalAmount === 0 && roomAmount > 0) {
            totalAmount = roomAmount;
        }

        diffAmount = totalAmount - roomAmount;
    }

    const handleSelectAllTrx = () => {
        if (selectedTrxIds.size === transactions.length) {
            setSelectedTrxIds(new Set());
        } else {
            const allIds = transactions.map(t => t.id);
            setSelectedTrxIds(new Set(allIds));
        }
    };

    const handleToggleTrx = (id: any) => {
        const newSet = new Set(selectedTrxIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTrxIds(newSet);
    };

    const handleOpenRateModal = () => {
        if (selectedTrxIds.size === 0 && manualRows.length === 0) {
            // Si no hay nada seleccionado, al menos permitir abrir para agregar manual
            // O podríamos abrirlo solo con el botón de "Enviar" si no hay transacciones pero se quiere manual
        }

        // Reset rates map when opening modal, but keep manualRows if logic requires (usually clear)
        setManualRates({});
        setManualRows([]); // Empezar limpio

        setIsRateModalOpen(true);

        // Cargar historial de notas REAL (notas_de_cuentas) para este modal
        if (selectedRow) {
            const resNum = String(selectedRow['Numero de la reserva']).trim();
            fetchAccountNotes(resNum).then(setAccountNotes).catch(console.error);
        }
    };

    const handleRateChange = (trxId: string, value: string) => {
        setManualRates(prev => ({
            ...prev,
            [trxId]: value
        }));
    };

    // --- Manual Row Handlers ---
    const handleAddManualRow = () => {
        setManualRows(prev => [
            ...prev,
            {
                id: `manual-${Date.now()}`,
                descripcion: '',
                nota: '',
                debito: '',
                credito: '',
                tasa: ''
            }
        ]);
    };

    const handleManualRowChange = (id: string, field: keyof ManualRow, value: string) => {
        setManualRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleRemoveManualRow = (id: string) => {
        setManualRows(prev => prev.filter(row => row.id !== id));
    };

    const handleSaveNotesWithRates = async () => {
        if (!selectedRow) return;

        setIsCopying(true);
        const selectedTrx = transactions.filter(t => selectedTrxIds.has(t.id));

        // 1. Process standard transactions
        const processedTrx = selectedTrx.map(t => {
            const manualRateStr = manualRates[t.id];
            const manualRate = manualRateStr ? parseFloat(manualRateStr) : 0;

            return {
                ...t,
                debito: parseCurrency(t.debito),
                credito: parseCurrency(t.credito), // Usar monto original
                tasa_manual: manualRate
            };
        });

        // 2. Process manual rows into similar structure
        const processedManualRows = manualRows.map(row => ({
            descripcion: row.descripcion,
            nota: row.nota,
            debito: parseFloat(row.debito) || 0,
            credito: parseFloat(row.credito) || 0,
            tasa_manual: parseFloat(row.tasa) || 0,
            id: row.id // Temporary ID, backend will generate real ID
        }));

        // Combine both
        const allItemsToSave = [...processedTrx, ...processedManualRows];

        const resNum = String(selectedRow['Numero de la reserva']).trim();

        // Pass hotelSource to the service function
        const success = await copyTransactionsToNotes(resNum, allItemsToSave, hotelSource);

        setIsCopying(false);

        if (success) {
            // Success Feedback
            showSnackbar("Registros enviados a notas correctamente.", 'success');
            setIsRateModalOpen(false); // Cierra el modal de tasas
            setSelectedTrxIds(new Set());
            setManualRates({});
            setManualRows([]);

            // Si se proporcionó un callback para recargar datos, cerrar todo y refrescar
            if (onDataChange) {
                handleCloseModal(); // Cierra el modal principal de detalle
                onDataChange(); // Recarga los datos de la tabla principal
            } else {
                // Refresh internal notes locally if needed
                if (!hideNotes) {
                    const idString = String(selectedRow['Numero de la reserva']).trim();
                    let fetchPromise;
                    if (useAccountNotes) {
                        fetchPromise = fetchAccountNotes(idString);
                    } else if (notesSourceView) {
                        fetchPromise = fetchNotesFromView(idString, notesSourceView);
                    } else {
                        fetchPromise = fetchNotes(idString);
                    }
                    fetchPromise.then(setNotes);
                }
            }
        } else {
            showSnackbar("Error al enviar transacciones a notas.", 'error');
        }
    };

    const handleUpdateRate = async () => {
        if (!selectedRow || !tempRate) return;
        setIsUpdatingRate(true);
        const resNum = String(selectedRow['Numero de la reserva']).trim();
        const rate = parseFloat(tempRate);

        if (isNaN(rate) || rate <= 0) {
            showSnackbar("Por favor ingresa una tasa válida.", 'error');
            setIsUpdatingRate(false);
            return;
        }

        let success = false;
        if (editingNoteId) {
            // Actualización de una sola nota
            success = await updateNoteRate(editingNoteId, rate);
        } else {
            // Actualización global para la reserva
            success = await updateAccountNotesRate(resNum, rate);
        }

        setIsUpdatingRate(false);
        if (success) {
            showSnackbar("Tasa actualizada correctamente.", 'success');
            setIsEditingRate(false);
            setEditingNoteId(null);
            // Reload notes
            setLoadingNotes(true);
            fetchAccountNotes(resNum).then(data => {
                setNotes(data);
                setLoadingNotes(false);
            }).catch(err => {
                console.error("Error reloading notes:", err);
                setLoadingNotes(false);
            });

            if (onDataChange) onDataChange();
        } else {
            showSnackbar("Error al actualizar la tasa.", 'error');
        }
    };

    const handleDeleteNote = (noteId: number) => {
        setDeleteConfirmation({ isOpen: true, noteId });
    };

    const handleConfirmDeleteNote = async () => {
        const noteId = deleteConfirmation.noteId;
        if (!noteId) return;

        setIsDeletingNote(true);
        const success = await deleteAccountNote(noteId);
        setIsDeletingNote(false);

        if (success) {
            showSnackbar("Nota eliminada correctamente.", 'success');
            setDeleteConfirmation({ isOpen: false, noteId: null });

            // Si tenemos onDataChange (recargar tabla padre), lo llamamos
            if (onDataChange) onDataChange();

            // Recargar las notas locales
            if (selectedRow) {
                const resNum = String(selectedRow['Numero de la reserva']).trim();
                setLoadingNotes(true);
                fetchAccountNotes(resNum)
                    .then(data => {
                        setNotes(data);
                        setLoadingNotes(false);
                    })
                    .catch(err => {
                        console.error(err);
                        setLoadingNotes(false);
                    });
            }
        } else {
            showSnackbar("No se pudo eliminar la nota. Intenta nuevamente.", 'error');
        }
    };

    const handleOpenCxCModal = async () => {
        if (selectedTrxIds.size === 0) {
            showSnackbar('Por favor selecciona al menos una transacción.', 'error');
            return;
        }
        setIsCxCModalOpen(true);
        setCxcType('cxc'); // Default to cxc
        if (uniqueSources.length === 0) {
            const { fetchAllUniqueSources } = await import('../services/supabaseService');
            const sources = await fetchAllUniqueSources();
            if (sources) setUniqueSources(sources);
        }
    };

    const handleSaveCxC = async () => {
        if (!cxcSource) {
            showSnackbar('Por favor selecciona una fuente de destino.', 'error');
            return;
        }

        setIsSavingCxC(true);
        try {
            const selectedTrx = transactions.filter(t => selectedTrxIds.has(t.id));
            const totalMonto = selectedTrx.reduce((acc, t) => acc + (parseCurrency(t.debito) || parseCurrency(t.credito) || 0), 0);

            const record = {
                reserva_id: String(selectedRow?.['Numero de la reserva'] || selectedRow?.['Registro Reserva'] || '').trim(),
                fuente_origen: String(selectedRow?.['Fuente'] || '').trim(),
                fuente_destino: cxcSource,
                monto: totalMonto,
                descripcion: `${cxcType === 'cxc' ? 'Cuenta por Cobrar' : 'Intercambio'} - Traspaso desde ${selectedRow?.['Fuente']}`,
                hotel: hotelSource === 'Plus D' ? 'plus' : 'palm',
                tipo: cxcType,
                fecha_in: selectedRow?.['Fecha de llegada'] || selectedRow?.['fecha_de_llegada'],
                fecha_out: selectedRow?.['Salida'] || selectedRow?.['salida'],
                huesped: String(selectedRow?.['Nombre'] || selectedRow?.['Huesped'] || selectedRow?.['huesped'] || '').trim() || undefined,
            };

            const { saveCxCRecords } = await import('../services/supabaseService');
            const success = await saveCxCRecords([record]);

            if (success) {
                showSnackbar(`${cxcType === 'cxc' ? 'Cuenta por Cobrar' : 'Intercambio'} guardado exitosamente.`, 'success');
                setIsCxCModalOpen(false);
                setCxcSource('');
                
                // Cerrar modal de detalles y refrescar la tabla principal
                if (onDataChange) {
                    handleCloseModal();
                    onDataChange();
                }
            } else {
                showSnackbar(`Error al guardar el ${cxcType === 'cxc' ? 'CxC' : 'Intercambio'}.`, 'error');
            }
        } catch (error) {
            console.error("Error saving CxC:", error);
            showSnackbar('Error inesperado al guardar.', 'error');
        } finally {
            setIsSavingCxC(false);
        }
    };

    const handleOpenInvoiceModal = () => {
        const today = new Date().toISOString().split('T')[0];
        setInvoiceDate(today);
        setInvoiceNumber(''); // Reset invoice number

        // Determinar Hotel
        let detectedHotel = '';
        if (hotelSource) {
            detectedHotel = hotelSource.replace(' D', ''); // Limpia "Plus D" -> "Plus"
        } else if (selectedRow) {
            // Fallback simple si no viene prop
            detectedHotel = selectedRow['Hotel'] || '';
        }
        setInvoiceHotel(detectedHotel);

        setIsInvoiceModalOpen(true);
    };

    const handleSaveInvoice = async () => {
        if (!selectedRow) return;

        if (!invoiceNumber.trim()) {
            showSnackbar("El número de factura es obligatorio.", 'error');
            return;
        }

        setIsSavingInvoice(true);

        const payload = {
            registro_reserva: String(selectedRow['Numero de la reserva']).trim(),
            factura: invoiceNumber.trim(),
            fecha_fac: invoiceDate, // Update to fecha_fac as requested
            hotel: invoiceHotel,
            // Dependiendo del modo (Auditoria Tasas vs General), seleccionamos el monto correcto
            montodv: useAccountNotes ? notesSummary.totalMonto : notesSummary.totalDebito,
            montobs: useAccountNotes ? notesSummary.totalBolivares : 0,
            fuente: selectedRow['Fuente'] || ''
        };

        const success = await saveInvoice(payload);

        setIsSavingInvoice(false);

        if (success) {
            showSnackbar("Factura guardada correctamente.", 'success');
            setIsInvoiceModalOpen(false);
            // Si hay callback para recargar datos, llamarlo
            if (onDataChange) {
                handleCloseModal(); // Cerrar modal principal
                onDataChange(); // Recargar datos de la tabla
            }
        } else {
            showSnackbar("Error al guardar la factura.", 'error');
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-10 bg-brand-950/50 rounded-lg">
                <p className="text-brand-300">No hay datos para mostrar con los filtros actuales.</p>
            </div>
        );
    }

    // Columnas que requieren formato monetario estándar (Europeo) en la tabla principal
    const moneyColumns = ['Total Hab.', 'Monto Pagado', 'Total General', 'Deposito', 'Saldo Pendiente', 'Monto CxC'];
    // Columnas que requieren alineación a la derecha
    const rightAlignedColumns = [
        'total hab.', 'monto pagado', 'total general', 'deposito', 'saldo pendiente',
        'debito', 'credito', 'monto divisa', 'monto bs', 'montodv', 'montobs', 'monto cxc'
    ];

    return (
        <>
            <Snackbar
                message={snackbar.message}
                type={snackbar.type}
                isOpen={snackbar.isOpen}
                onClose={closeSnackbar}
            />
            <div>
                <div className="w-full overflow-x-auto rounded-lg border border-brand-800">
                    <table className="w-full min-w-max text-sm text-left text-brand-200">
                        <thead className="text-sm text-brand-300 uppercase bg-brand-800/50">
                            <tr>
                                {headers.map((header) => {
                                    const isRoomColumn = header === 'Numero de habitacion';
                                    const isSorted = sortConfig?.key === header;
                                    const isAsc = isSorted && sortConfig.direction === 'asc';

                                    // Use standardized header (App Key)
                                    const displayHeader = header;
                                    // Use tooltip for original header info
                                    const originalHeader = originalHeaderMap ? originalHeaderMap[header] : null;
                                    const tooltip = originalHeader && originalHeader !== header
                                        ? `Original: ${originalHeader}`
                                        : header;

                                    const headerLower = header.toLowerCase();
                                    const isRightAligned = rightAlignedColumns.includes(headerLower);

                                    return (
                                        <th
                                            key={header}
                                            scope="col"
                                            className={`px-2 py-2 sticky top-0 bg-brand-800/80 backdrop-blur-sm cursor-pointer select-none hover:bg-brand-700/50 transition-colors group ${isRoomColumn ? 'w-28' : ''} ${isRightAligned ? 'text-right' : ''}`}
                                            onClick={() => handleSort(header)}
                                            title={tooltip}
                                        >
                                            <div className={`flex items-center gap-1 ${isRightAligned ? 'justify-end' : ''}`}>
                                                <span>{displayHeader}</span>
                                                <div className={`flex flex-col ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} transition-opacity`}>
                                                    <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${isAsc ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </th>
                                    );
                                })}
                                {(onEditRow || onDeleteRow) && (
                                    <th className="px-4 py-2 sticky top-0 bg-brand-800/80 backdrop-blur-sm w-24 text-right">
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {selectedData.map((row, rowIndex) => (
                                <tr
                                    key={startIndex + rowIndex}
                                    onClick={() => handleRowClick(row)}
                                    className="bg-brand-900/80 border-b border-brand-800 hover:bg-brand-700/80 transition-colors duration-200 cursor-pointer"
                                >
                                    {headers.map((header) => {
                                        const isRoomColumn = header === 'Numero de habitacion';
                                        let cellContent = String(row[header]);
                                        const headerLower = header.toLowerCase();

                                        // Check alignment
                                        const isRightAligned = rightAlignedColumns.includes(headerLower);

                                        // FORMATTING RULES BASED ON COLUMN NAME

                                        // 1. Fecha y Hora (DD-MM-YYYY hh:mm am/pm)
                                        if (headerLower === 'fecha y hora' || headerLower === 'fecha_hora') {
                                            cellContent = formatDateTime(row[header]);
                                        }
                                        // 2. Fecha del Servicio (DD-MM-YYYY)
                                        else if (headerLower === 'fecha del servicio' || headerLower === 'fecha_servicio') {
                                            cellContent = formatDateDashes(row[header]);
                                        }
                                        // 3. Debito/Credito/Cantidad (US Format #,##0.00)
                                        else if (['debito', 'credito', 'débito', 'crédito', 'cantidad', 'debito (bs)', 'credito (bs)', 'monto divisa', 'monto bs', 'montodv', 'montobs'].includes(headerLower)) {
                                            cellContent = formatDecimalUS(row[header]);
                                        }
                                        // 4. Codigo (Force Text)
                                        else if (headerLower.includes('codigo')) {
                                            cellContent = String(row[header] || '');
                                        }
                                        // 5. Formato de fecha estándar (tabla principal, columnas conocidas)
                                        else if (header === 'Fecha de llegada' || header === 'Salida' || header === 'Fecha Factura') {
                                            cellContent = formatDate(row[header]);
                                        }
                                        // 6. Formato de moneda estándar (tabla principal, columnas conocidas)
                                        else if (moneyColumns.includes(header)) {
                                            // Check for explicit Null or null/undefined for Deposito
                                            if (header === 'Deposito') {
                                                if (row[header] === null || row[header] === undefined || String(row[header]).toLowerCase() === 'null') {
                                                    cellContent = formatMoney(0);
                                                } else {
                                                    cellContent = formatMoney(row[header]);
                                                }
                                            } else {
                                                cellContent = formatMoney(row[header]);
                                            }
                                        }
                                        else {
                                            if (row[header] === null || row[header] === undefined) {
                                                cellContent = '';
                                            }
                                        }

                                        return (
                                            <td
                                                key={`${startIndex + rowIndex}-${header}`}
                                                className={`px-2 py-2 ${isRoomColumn ? 'whitespace-normal break-all text-xs leading-tight' : ''} ${isRightAligned ? 'text-right' : ''}`}
                                                title={isRoomColumn ? String(row[header]) : undefined}
                                            >
                                                {cellContent}
                                            </td>
                                        );
                                    })}

                                    {(onEditRow || onDeleteRow) && (
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {onEditRow && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditRow(row);
                                                        }}
                                                        className="p-1 text-brand-400 hover:text-white hover:bg-brand-700/50 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onDeleteRow && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteRow(row);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-red-400 hover:bg-brand-700/50 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 text-sm text-brand-300">
                        <div>
                            Página <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded-md bg-brand-800 text-white hover:bg-brand-600 disabled:bg-brand-900 disabled:cursor-not-allowed transition-colors"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded-md bg-brand-800 text-white hover:bg-brand-600 disabled:bg-brand-900 disabled:cursor-not-allowed transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div>
                            Mostrando <span className="font-bold text-white">{selectedData.length}</span> de <span className="font-bold text-white">{data.length}</span> resultados
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Emergente usando Portal (Mismo código anterior) */}
            {selectedRow && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-12 p-4 bg-brand-950/80 backdrop-blur-sm animate-fade-in"
                    onClick={handleCloseModal}
                >
                    <div
                        className={`bg-brand-900 border border-brand-700 rounded-2xl shadow-2xl w-full overflow-hidden animate-fade-in-up relative max-h-[90vh] flex flex-col transition-all duration-300 ${viewMode !== 'details' ? 'max-w-4xl' : 'max-w-lg'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Visual Decorativo */}
                        <div className="h-2 w-full bg-gradient-to-r from-brand-400 to-brand-600 shrink-0"></div>

                        {viewMode === 'details' ? (
                            // VISTA 1: DETALLES DE LA RESERVA (Compactada)
                            <div className="p-5 flex flex-col space-y-4 overflow-y-auto">

                                {/* Header Compacto: Reserva y Huésped */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="text-center w-full">
                                            <p className="text-[10px] uppercase tracking-wider text-brand-400 font-bold mb-0.5">
                                                Historial de Notas
                                            </p>
                                            <div className="flex items-center justify-center gap-2">
                                                {(selectedRow['Fuente'] || selectedRow['fuente']) && (
                                                    <span className="text-xs text-brand-300 font-medium">
                                                        {selectedRow['Fuente'] || selectedRow['fuente']}
                                                    </span>
                                                )}
                                                {(selectedRow['Fuente'] || selectedRow['fuente']) && (selectedRow['Nombre'] || selectedRow['Huesped']) && (
                                                    <span className="text-brand-600">•</span>
                                                )}
                                                {(selectedRow['Nombre'] || selectedRow['Huesped']) && (
                                                    <span className="text-xs text-brand-300 font-medium truncate max-w-[200px]">
                                                        {selectedRow['Nombre'] || selectedRow['Huesped']}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-2xl font-bold text-white tracking-tight leading-none mt-1">
                                                #{selectedRow['Factura'] || selectedRow['Numero de la reserva'] || selectedRow['Registro Reserva'] || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjeta Unificada: Fechas y Finanzas */}
                                <div className="bg-brand-950/40 rounded-xl border border-brand-800/50 p-3 space-y-3">
                                    {/* Fechas */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-brand-800/20 rounded-lg p-2 text-center border border-brand-800/30">
                                            <p className="text-[10px] uppercase text-brand-400 font-bold mb-0.5">
                                                {selectedRow['Fecha Factura'] ? 'Fecha Factura' : 'Llegada'}
                                            </p>
                                            <p className="text-base font-bold text-white">
                                                {formatDate(selectedRow['Fecha Factura'] || selectedRow['Fecha de llegada'])}
                                            </p>
                                        </div>
                                        {!selectedRow['Fecha Factura'] && (
                                            <div className="bg-brand-800/20 rounded-lg p-2 text-center border border-brand-800/30">
                                                <p className="text-[10px] uppercase text-brand-400 font-bold mb-0.5">Salida</p>
                                                <p className="text-base font-bold text-white">{formatDate(selectedRow['Salida'])}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Divider sutil */}
                                    <div className="h-px bg-brand-800/50 w-full"></div>

                                    {/* Info Financiera Compacta */}
                                    <div className="grid grid-cols-3 gap-0 divide-x divide-brand-800/50">
                                        {(selectedRow['Monto Divisa'] !== undefined || selectedRow['Monto Bs'] !== undefined || selectedRow['montobs'] !== undefined) ? (
                                            <>
                                                <div className="flex flex-col items-center px-1">
                                                    <p className="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-0.5">Divisa</p>
                                                    <p className="text-sm font-bold text-white">{formatDecimalUS(selectedRow['Monto Divisa'] || 0)}</p>
                                                </div>
                                                <div className="flex flex-col items-center px-1 col-span-2">
                                                    <p className="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-0.5">Bolívares</p>
                                                    <p className="text-sm font-bold text-brand-100">{formatDecimalUS(selectedRow['Monto Bs'] || selectedRow['montobs'] || 0)}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-col items-center px-1">
                                                    <p className="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-0.5">Habitación</p>
                                                    <p className="text-sm font-bold text-white">{formatMoney(roomAmount)}</p>
                                                </div>

                                                <div className="flex flex-col items-center px-1">
                                                    <p className="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-0.5">Extras</p>
                                                    <p className="text-sm font-bold text-brand-200">{formatMoney(diffAmount)}</p>
                                                </div>

                                                <div className="flex flex-col items-center px-1">
                                                    <p className="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-0.5">Total</p>
                                                    <p className="text-sm font-bold text-brand-100">{formatMoney(totalAmount)}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Resumen de Notas Recientes */}
                                {!hideNotes && (
                                    <div className="bg-brand-950/20 rounded-xl border border-brand-800/30 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-brand-800/50 bg-brand-800/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ClipboardIcon className="w-3.5 h-3.5 text-brand-400" />
                                                <span className="text-[10px] uppercase font-bold text-brand-300 tracking-wider">Notas Recientes</span>
                                            </div>
                                            {loadingNotes && (
                                                <div className="flex gap-1">
                                                    <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="divide-y divide-brand-800/30 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-800 scrollbar-track-transparent">
                                            {loadingNotes ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-[10px] text-brand-500 animate-pulse italic">Buscando notas...</p>
                                                </div>
                                            ) : notes.length > 0 ? (
                                                notes.slice(0, 3).map((note, idx) => (
                                                    <div key={idx} className="p-2.5 hover:bg-brand-800/10 transition-colors">
                                                        <div className="flex justify-between items-start gap-2 mb-1">
                                                            <span className="text-[9px] text-brand-500 font-mono">
                                                                {formatDateTime(note.fecha_edit || note.created_at || note.fecha_hora).split(' ')[0]}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-brand-200">
                                                                {formatMoney(note.monto || note.debito || 0)}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-brand-100 line-clamp-2 leading-relaxed text-left">
                                                            {note.nota || note.descripcion || 'Sin descripción'}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center">
                                                    <p className="text-[10px] text-brand-500 italic">No hay notas registradas para esta reserva.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Botones de Acción */}
                                <div className="flex flex-col gap-2 pt-1">
                                    {/* Botón Historial de Notas - CONDICIONAL */}
                                    {!hideNotes && !loadingNotes && notes.length > 0 && (
                                        <button
                                            onClick={() => setViewMode('notes')}
                                            className="flex items-center justify-between w-full px-3 py-2.5 bg-brand-800 rounded-lg border border-brand-700 hover:bg-brand-700 transition-colors group text-sm"
                                        >
                                            <div className="flex items-center gap-2 text-brand-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-brand-400">
                                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-2.25a.75.75 0 0 0-.75-.75h-3.75V6Z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-medium">Historial de Notas</span>
                                            </div>
                                            <span className="flex items-center gap-1 text-xs text-brand-400 group-hover:translate-x-1 transition-transform">
                                                {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        </button>
                                    )}

                                    {/* Botón Transacciones - CONDICIONAL */}
                                    {!hideTransactions && !loadingTransactions && (
                                        <button
                                            onClick={() => setViewMode('transactions')}
                                            className="flex items-center justify-between w-full px-3 py-2.5 bg-brand-800 rounded-lg border border-brand-700 hover:bg-brand-700 transition-colors group text-sm"
                                        >
                                            <div className="flex items-center gap-2 text-brand-200">
                                                <BanknotesIcon className="w-4 h-4 text-brand-400" />
                                                <span className="font-medium">Transacciones</span>
                                            </div>
                                            <span className="flex items-center gap-1 text-xs text-brand-400 group-hover:translate-x-1 transition-transform">
                                                {(transactions.length > 0 || manualRows.length > 0 || (selectedTrxIds.size === 0 && manualRows.length === 0)) ? 'Gestionar' : `${transactions.length} regs.`}
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        </button>
                                    )}

                                    {(loadingNotes || loadingTransactions) && (
                                        <div className="text-center text-xs text-brand-500 animate-pulse py-1">
                                            Cargando datos adicionales...
                                        </div>
                                    )}
                                </div>

                                {/* Botón Salir */}
                                <div className="w-full pt-2">
                                    <button
                                        onClick={handleCloseModal}
                                        className="w-full py-2.5 px-6 bg-brand-700 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50 shadow-lg hover:shadow-brand-900/50 transform hover:-translate-y-0.5 text-base"
                                    >
                                        Salir
                                    </button>
                                </div>
                            </div>
                        ) : viewMode === 'notes' ? (
                            // VISTA 2: HISTORIAL DE NOTAS (Mismo de siempre)
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Header de Navegación */}
                                <div className="px-6 py-4 border-b border-brand-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setViewMode('details')}
                                            className="p-1 rounded-full hover:bg-brand-800 text-brand-400 hover:text-white transition-colors flex-shrink-0"
                                        >
                                            <ChevronLeftIcon className="w-6 h-6" />
                                        </button>
                                        <h3 className="text-lg font-bold text-white whitespace-nowrap hidden sm:block">Historial de Notas</h3>
                                    </div>

                                    <div className="flex flex-col items-center justify-center">
                                        {selectedRow['Fuente'] && (
                                            <span className="text-[10px] uppercase tracking-wider text-brand-400 font-bold leading-tight">
                                                {selectedRow['Fuente']}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium text-brand-50 truncate max-w-[200px] sm:max-w-[300px] leading-tight text-center">
                                            {selectedRow['Nombre'] || selectedRow['Huesped'] || 'Sin Nombre'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xl sm:text-2xl font-bold text-brand-400 font-mono tracking-tight">
                                            #{selectedRow['Numero de la reserva']}
                                        </span>
                                    </div>
                                </div>
                                {/* ... Tabla de Notas (mismo código) ... */}
                                <div className="flex-1 overflow-y-auto p-4 bg-brand-900/30">
                                    <table className="w-full text-xs text-left text-brand-200">
                                        {/* ... Header ... */}
                                        <thead className="bg-brand-800/80 sticky top-0 backdrop-blur-sm z-10 shadow-sm">
                                            {useAccountNotes ? (
                                                <tr>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 rounded-tl-lg w-[15%]">Fecha</th>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 w-auto">Nota</th>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 text-right w-[15%] whitespace-nowrap">Monto</th>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 text-right rounded-tr-lg w-[15%] whitespace-nowrap">Tasa</th>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 rounded-tl-lg w-[12%]">Fecha</th>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 w-auto">Nota</th>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 text-right w-[1%] whitespace-nowrap">Débito</th>
                                                    <th className="px-3 py-3 font-semibold text-brand-400 text-right rounded-tr-lg w-[1%] whitespace-nowrap">Crédito</th>
                                                </tr>
                                            )}
                                        </thead>
                                        {/* ... Body ... */}
                                        <tbody className="divide-y divide-brand-800/30">
                                            {notes.map((note, i) => {
                                                // ... logic ...
                                                const dateStr = note.fecha_edit || note.fecha_hora || note.created_at;
                                                const date = dateStr ? new Date(dateStr) : null;
                                                const formattedDate = date && !isNaN(date.getTime())
                                                    ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                    : (dateStr || '-');

                                                // Modified content rendering to support both description and note
                                                const content = (
                                                    <>
                                                        {note.descripcion && <div>{note.descripcion}</div>}
                                                        {note.nota && <div className={`${note.descripcion ? 'text-brand-400 text-xs mt-1' : ''}`}>{note.nota}</div>}
                                                        {!note.descripcion && !note.nota && '-'}
                                                    </>
                                                );

                                                // ... return tr ...
                                                if (useAccountNotes) {
                                                    return (
                                                        <tr key={i} className="hover:bg-brand-800/30 transition-colors group">
                                                            <td className="px-3 py-3 whitespace-nowrap opacity-70 align-top">{formattedDate}</td>
                                                            <td className="px-3 py-3 whitespace-normal break-words align-top text-white">{content}</td>
                                                            <td className="px-3 py-3 text-right align-top whitespace-nowrap font-medium text-brand-100">{note.monto ? formatMoney(note.monto) : '-'}</td>
                                                            <td className="px-3 py-3 text-right align-top whitespace-nowrap text-brand-300">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <span className="opacity-70">{note.tasa ? formatDecimalUS(note.tasa) : '-'}</span>
                                                                    {/* ... Buttons ... */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setTempRate(note.tasa ? String(note.tasa) : '');
                                                                            setEditingNoteId(note.id);
                                                                            setIsEditingRate(true);
                                                                        }}
                                                                        className="text-brand-500 hover:text-brand-300 transition-colors"
                                                                        title="Editar tasa"
                                                                    >
                                                                        <PencilSquareIcon className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNote(note.id)}
                                                                        className="text-red-500 hover:text-red-400 transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                return (
                                                    <tr key={i} className="hover:bg-brand-800/30 transition-colors">
                                                        <td className="px-3 py-3 whitespace-nowrap opacity-70 align-top">{formattedDate}</td>
                                                        <td className="px-3 py-3 whitespace-normal break-words align-top text-white">{content}</td>
                                                        <td className="px-3 py-3 text-right align-top whitespace-nowrap font-medium text-brand-100">{note.debito ? formatMoney(note.debito) : '-'}</td>
                                                        <td className="px-3 py-3 text-right opacity-70 align-top whitespace-nowrap">{note.credito ? formatMoney(note.credito) : '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* ... Footer ... */}
                                        <tfoot className="bg-brand-800/90 sticky bottom-0 backdrop-blur-sm z-10 border-t border-brand-600 shadow-lg">
                                            {useAccountNotes ? (
                                                <tr>
                                                    <td colSpan={2} className="px-3 py-4 align-top">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={handleOpenInvoiceModal}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-700/80 rounded-lg shadow-sm border border-brand-600 hover:bg-brand-600 transition-all cursor-pointer group"
                                                                    title="Generar Factura"
                                                                >
                                                                    <CalculatorIcon className="w-4 h-4 text-brand-300 group-hover:text-white" />
                                                                    <span className="text-xs font-semibold text-brand-200 group-hover:text-white">Factura</span>
                                                                </button>
                                                            </div>
                                                            <span className="font-bold text-brand-400 uppercase tracking-wider text-xl">
                                                                TOTALES
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-white text-xl align-top whitespace-nowrap">
                                                        {formatMoney(notesSummary.totalMonto)}
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-brand-200 text-xl align-top whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span>{formatMoney(notesSummary.totalBolivares)} Bs</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} className="px-3 py-4 align-top">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={handleOpenInvoiceModal}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-700/80 rounded-lg shadow-sm border border-brand-600 hover:bg-brand-600 transition-all cursor-pointer group"
                                                                    title="Generar Factura"
                                                                >
                                                                    <CalculatorIcon className="w-4 h-4 text-brand-300 group-hover:text-white" />
                                                                    <span className="text-xs font-semibold text-brand-200 group-hover:text-white">Factura</span>
                                                                </button>
                                                            </div>
                                                            <span className="font-bold text-brand-400 uppercase tracking-wider text-xl">
                                                                TOTALES
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-white text-3xl align-top whitespace-nowrap">
                                                        {formatMoney(notesSummary.totalDebito)}
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-green-400 text-3xl align-top whitespace-nowrap">
                                                        {formatMoney(notesSummary.totalCredito)}
                                                    </td>
                                                </tr>
                                            )}
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            // VISTA 3: TRANSACCIONES (Mismo código)
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Header de Navegación */}
                                <div className="px-6 py-4 border-b border-brand-800 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setViewMode('details')}
                                            className="p-1 rounded-full hover:bg-brand-800 text-brand-400 hover:text-white transition-colors flex-shrink-0"
                                        >
                                            <ChevronLeftIcon className="w-6 h-6" />
                                        </button>
                                        <h3 className="text-lg font-bold text-white whitespace-nowrap hidden sm:block">Transacciones</h3>
                                    </div>

                                    <div className="flex flex-col items-center justify-center">
                                        {selectedRow['Fuente'] && (
                                            <span className="text-[10px] uppercase tracking-wider text-brand-400 font-bold leading-tight">
                                                {selectedRow['Fuente']}
                                            </span>
                                        )}
                                        <span className="text-sm font-medium text-brand-50 truncate max-w-[200px] sm:max-w-[300px] leading-tight text-center">
                                            {selectedRow['Nombre'] || selectedRow['Huesped'] || 'Sin Nombre'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {selectedTrxIds.size > 0 && (
                                            <button
                                                onClick={handleOpenCxCModal}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-brand-300 text-xs font-bold rounded-lg transition-colors shadow-sm animate-fade-in"
                                            >
                                                <BanknotesIcon className="w-4 h-4" />
                                                CxC
                                            </button>
                                        )}
                                        {(selectedTrxIds.size > 0 || manualRows.length > 0) && (
                                            <button
                                                onClick={handleOpenRateModal}
                                                disabled={isCopying}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm animate-fade-in"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                                Enviar a Notas
                                            </button>
                                        )}
                                        {(transactions.length === 0 && selectedTrxIds.size === 0 && manualRows.length === 0) && (
                                            <button
                                                onClick={handleOpenRateModal}
                                                disabled={isCopying}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-brand-200 text-xs font-bold rounded-lg transition-colors shadow-sm animate-fade-in"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Agregar Manual
                                            </button>
                                        )}
                                        <span className="text-xl sm:text-2xl font-bold text-brand-400 font-mono tracking-tight">
                                            #{selectedRow['Numero de la reserva']}
                                        </span>
                                    </div>
                                </div>

                                {/* Tabla de Transacciones */}
                                <div className="flex-1 overflow-y-auto p-4 bg-brand-900/30">
                                    {/* ... Content ... */}
                                    {transactions.length > 0 ? (
                                        <table className="w-full text-xs text-left text-brand-200">
                                            <thead className="bg-brand-800/80 sticky top-0 backdrop-blur-sm z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-2 py-2 font-semibold text-brand-400 rounded-tl-lg w-8 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={transactions.length > 0 && selectedTrxIds.size === transactions.length}
                                                            onChange={handleSelectAllTrx}
                                                            className="w-4 h-4 rounded bg-brand-900 border-brand-600 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                                        />
                                                    </th>
                                                    <th className="px-2 py-2 font-semibold text-brand-400">Fecha</th>
                                                    <th className="px-2 py-2 font-semibold text-brand-400">Descripción</th>
                                                    <th className="px-2 py-2 font-semibold text-brand-400">Nota</th>
                                                    <th className="px-2 py-2 font-semibold text-brand-400">Usuario</th>
                                                    <th className="px-2 py-2 font-semibold text-brand-400 text-right">Débito</th>
                                                    <th className="px-2 py-2 font-semibold text-brand-400 text-right rounded-tr-lg">Crédito</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-800/30">
                                                {transactions.map((trx, i) => {
                                                    // ... Logic ...
                                                    const dateStr = trx.fecha_hora || trx.fecha_servicio;
                                                    const formattedDate = formatDateTime(dateStr);
                                                    const debito = parseCurrency(trx.debito);
                                                    const credito = parseCurrency(trx.credito);
                                                    const isSelected = selectedTrxIds.has(trx.id);

                                                    return (
                                                        <tr
                                                            key={i}
                                                            className={`transition-colors ${isSelected ? 'bg-brand-800/50' : 'hover:bg-brand-800/30'}`}
                                                            onClick={() => handleToggleTrx(trx.id)}
                                                        >
                                                            {/* ... Cells ... */}
                                                            <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => handleToggleTrx(trx.id)}
                                                                    className="w-4 h-4 rounded bg-brand-900 border-brand-600 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2 whitespace-nowrap opacity-70">{formattedDate}</td>
                                                            <td className="px-2 py-2 whitespace-normal break-words font-medium text-white">{trx.descripcion}</td>
                                                            <td className="px-2 py-2 whitespace-normal break-words opacity-80">{trx.nota || ''}</td>
                                                            <td className="px-2 py-2 opacity-70">{trx.usuario || '-'}</td>
                                                            <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${debito > 0 ? 'text-brand-100' : 'opacity-50'}`}>
                                                                {debito > 0 ? formatDecimalUS(debito) : '-'}
                                                            </td>
                                                            <td className={`px-2 py-2 text-right font-medium whitespace-nowrap ${credito > 0 ? 'text-green-400' : 'opacity-50'}`}>
                                                                {credito > 0 ? formatDecimalUS(credito) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            {/* ... Footer ... */}
                                            <tfoot className="bg-brand-800/90 sticky bottom-0 backdrop-blur-sm z-10 border-t border-brand-600 shadow-lg">
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-4 text-right font-bold text-brand-400 uppercase tracking-wider text-xl">
                                                        TOTALES
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-white text-xl whitespace-nowrap">
                                                        {formatDecimalUS(transactionsSummary.totalDebito)}
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-green-400 text-xl whitespace-nowrap">
                                                        {formatDecimalUS(transactionsSummary.totalCredito)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-2 text-right font-medium text-brand-300 uppercase tracking-wider text-sm border-t border-brand-700/50">
                                                        SALDO
                                                    </td>
                                                    <td colSpan={2} className={`px-3 py-2 text-center font-bold text-2xl border-t border-brand-700/50 ${transactionsSummary.balance > 0 ? 'text-brand-100' : 'text-green-400'}`}>
                                                        {formatDecimalUS(transactionsSummary.balance)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    ) : (
                                        <div className="text-center py-10 text-brand-400 flex flex-col items-center gap-4">
                                            <p>No se encontraron transacciones asociadas.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}


            {/* ... Other Modals (RateModal, EditRateModal, DeleteConfirmation) ... same as before */}
            {isRateModalOpen && createPortal(
                // ... Rate Modal Content ...
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-brand-950/90 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-fade-in-up">
                        {/* ... Header ... */}
                        <div className="px-6 py-4 border-b border-brand-800 flex justify-between items-center bg-brand-800/50 rounded-t-2xl">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <PencilSquareIcon className="w-5 h-5 text-brand-400" />
                                Confirmar Tasas Manuales
                            </h3>
                            <button
                                onClick={() => setIsRateModalOpen(false)}
                                className="text-brand-400 hover:text-white transition-colors"
                            >
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {/* ... Body ... */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Section 1 */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-2">
                                    <ClipboardIcon className="w-4 h-4 text-brand-500" />
                                    Historial de Notas Existente
                                </h4>
                                <div className="bg-brand-950/50 rounded-lg border border-brand-800 overflow-hidden max-h-48 overflow-y-auto">
                                    <table className="w-full text-xs text-left text-brand-200">
                                        {/* ... Table ... */}
                                        <thead className="bg-brand-800/80 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold text-brand-400">Fecha</th>
                                                <th className="px-3 py-2 font-semibold text-brand-400">Nota</th>
                                                <th className="px-3 py-2 font-semibold text-brand-400 text-right">Monto</th>
                                                <th className="px-3 py-2 font-semibold text-brand-400 text-right">Tasa</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-800/30">
                                            {accountNotes.length > 0 ? (
                                                accountNotes.map((note, i) => (
                                                    <tr key={i} className="hover:bg-brand-800/20">
                                                        <td className="px-3 py-1.5 whitespace-nowrap opacity-70">
                                                            {formatDateTime(note.fecha_edit || note.created_at)}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-white break-words">
                                                            {note.descripcion ? (
                                                                <>
                                                                    <div className="font-medium">{note.descripcion}</div>
                                                                    {note.nota && <div className="text-brand-400 text-xs mt-0.5">{note.nota}</div>}
                                                                </>
                                                            ) : (
                                                                note.nota
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-medium text-brand-100">
                                                            {formatDecimalUS(note.monto)}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right text-brand-300">
                                                            {formatDecimalUS(note.tasa)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-4 text-center text-brand-500 italic">
                                                        No hay notas registradas para esta reserva.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="border-t border-brand-800/50"></div>

                            {/* Section 2 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-2">
                                        <PencilSquareIcon className="w-4 h-4 text-brand-500" />
                                        Nuevas Transacciones a Agregar
                                    </h4>
                                    <button
                                        onClick={handleAddManualRow}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-brand-700/50 hover:bg-brand-600/50 text-brand-300 hover:text-white rounded border border-brand-600/50 text-xs font-semibold transition-colors"
                                        title="Agregar fila manual"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Agregar Fila
                                    </button>
                                </div>

                                <div className="overflow-hidden rounded-lg border border-brand-800">
                                    <table className="w-full text-sm text-left text-brand-200">
                                        {/* ... Table ... */}
                                        <thead className="bg-brand-800 text-brand-300 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold rounded-tl-lg">Descripción</th>
                                                <th className="px-4 py-3 font-semibold">Nota</th>
                                                <th className="px-4 py-3 font-semibold text-right">Débito</th>
                                                <th className="px-4 py-3 font-semibold text-right text-green-400">Crédito</th>
                                                <th className="px-4 py-3 font-semibold text-right text-brand-400">Tasa</th>
                                                <th className="px-2 py-3 font-semibold rounded-tr-lg w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-800">
                                            {/* Transacciones Seleccionadas (Read Only) */}
                                            {transactions
                                                .filter(t => selectedTrxIds.has(t.id))
                                                .map((trx) => (
                                                    <tr key={trx.id} className="hover:bg-brand-800/30">
                                                        <td className="px-4 py-3 font-medium text-white break-words">{trx.descripcion}</td>
                                                        <td className="px-4 py-3 text-brand-300 break-words">{trx.nota || '-'}</td>
                                                        <td className="px-4 py-3 text-right text-brand-100">{trx.debito ? formatDecimalUS(trx.debito) : '-'}</td>
                                                        <td className="px-4 py-3 text-right text-green-400 font-medium">
                                                            {trx.credito && parseCurrency(trx.credito) > 0 ? (
                                                                formatDecimalUS(trx.credito)
                                                            ) : (
                                                                <span className="opacity-50">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                value={manualRates[trx.id] || ''}
                                                                onChange={(e) => handleRateChange(trx.id, e.target.value)}
                                                                className="w-24 bg-brand-800 border border-brand-600 rounded px-2 py-1 text-right text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                                autoFocus={false}
                                                            />
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                ))}

                                            {/* Filas Manuales (Editables) */}
                                            {manualRows.map((row) => (
                                                <tr key={row.id} className="hover:bg-brand-800/30 bg-brand-800/10">
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Descripción"
                                                            value={row.descripcion}
                                                            onChange={(e) => handleManualRowChange(row.id, 'descripcion', e.target.value)}
                                                            className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-brand-500"
                                                            autoFocus
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Nota (opcional)"
                                                            value={row.nota}
                                                            onChange={(e) => handleManualRowChange(row.id, 'nota', e.target.value)}
                                                            className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-brand-200 text-xs focus:ring-1 focus:ring-brand-500"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            value={row.debito}
                                                            onChange={(e) => handleManualRowChange(row.id, 'debito', e.target.value)}
                                                            className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-right text-brand-100 text-xs focus:ring-1 focus:ring-brand-500"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            value={row.credito}
                                                            onChange={(e) => handleManualRowChange(row.id, 'credito', e.target.value)}
                                                            className="w-full bg-brand-900 border border-brand-700 rounded px-2 py-1 text-right text-green-400 font-medium text-xs focus:ring-1 focus:ring-brand-500"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            value={row.tasa}
                                                            onChange={(e) => handleManualRowChange(row.id, 'tasa', e.target.value)}
                                                            className="w-24 bg-brand-900 border border-brand-700 rounded px-2 py-1 text-right text-brand-300 text-xs focus:ring-1 focus:ring-brand-500"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <button
                                                            onClick={() => handleRemoveManualRow(row.id)}
                                                            className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20"
                                                            title="Eliminar fila"
                                                        >
                                                            <CloseIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Mensaje vacío si no hay nada */}
                                            {transactions.filter(t => selectedTrxIds.has(t.id)).length === 0 && manualRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-brand-500 italic text-xs">
                                                        No hay transacciones seleccionadas ni filas manuales.
                                                        <br />
                                                        Usa el botón "Agregar Fila" para crear un registro manual.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-brand-800/90 font-bold border-t border-brand-600">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 text-right text-brand-400 uppercase tracking-wider text-xs">
                                                    TOTALES A PROCESAR
                                                </td>
                                                <td className="px-4 py-3 text-right text-brand-100 text-base">
                                                    {formatDecimalUS(manualRateTotals.totalDebito)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-green-400 text-base">
                                                    {formatDecimalUS(manualRateTotals.totalCredito)}
                                                </td>
                                                <td colSpan={2} className="px-4 py-3 text-right text-brand-100 font-mono text-base">
                                                    {formatDecimalUS(manualRateTotals.totalBolivares)} <span className="text-xs text-brand-500">Bs</span>
                                                </td>
                                            </tr>
                                            {(() => {
                                                const difference = manualRateTotals.totalCredito - roomAmount;
                                                // Solo mostrar si la diferencia es significativa (evitar errores de redondeo flotante)
                                                if (Math.abs(difference) < 0.01) return null;

                                                return (
                                                    <tr className="bg-brand-900/50">
                                                        <td colSpan={2} className="px-4 py-2 text-right text-brand-400 text-xs italic font-normal">
                                                            Diferencia (Crédito - Habitación):
                                                        </td>
                                                        <td className={`px-4 py-2 text-right text-xs font-bold ${difference !== 0 ? 'text-yellow-400' : 'text-brand-500'}`}>
                                                            {formatDecimalUS(difference)}
                                                        </td>
                                                        <td colSpan={3}></td>
                                                    </tr>
                                                );
                                            })()}
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-brand-800 bg-brand-800/50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsRateModalOpen(false)}
                                className="px-4 py-2 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveNotesWithRates}
                                disabled={isCopying}
                                className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50"
                            >
                                {isCopying ? (
                                    <span className="animate-pulse">Guardando...</span>
                                ) : (
                                    <>
                                        <SaveIcon className="w-5 h-5" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal para Editar Tasa (Global o Individual) */}
            {isEditingRate && createPortal(
                // ... Edit Rate Modal ...
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-950/90 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <PencilSquareIcon className="w-5 h-5 text-brand-400" />
                            {editingNoteId ? 'Editar Tasa de Nota' : 'Editar Tasa de Cambio'}
                        </h3>
                        <p className="text-brand-300 text-sm mb-6 leading-relaxed">
                            {editingNoteId
                                ? 'Se actualizará la tasa de cambio para esta nota específica.'
                                : 'Se actualizará la tasa de cambio para todas las notas registradas en esta reserva.'}
                        </p>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-brand-400 uppercase mb-2">Nueva Tasa (Bs/USD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 font-bold">Bs.</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={tempRate}
                                    onChange={(e) => setTempRate(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-lg shadow-inner"
                                    placeholder="0.00"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateRate();
                                        if (e.key === 'Escape') setIsEditingRate(false);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditingRate(false)}
                                className="px-4 py-2 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateRate}
                                disabled={isUpdatingRate || !tempRate}
                                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUpdatingRate ? (
                                    <span className="animate-pulse">Guardando...</span>
                                ) : (
                                    <>
                                        <SaveIcon className="w-4 h-4" />
                                        Aplicar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Confirmación de Eliminación */}
            {deleteConfirmation.isOpen && createPortal(
                // ... Delete Modal ...
                <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-brand-950/90 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <TrashIcon className="w-5 h-5 text-red-500" />
                            Eliminar Nota
                        </h3>
                        <p className="text-brand-300 text-sm mb-6 leading-relaxed">
                            ¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: false, noteId: null })}
                                className="px-4 py-2 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDeleteNote}
                                disabled={isDeletingNote}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeletingNote ? (
                                    <span className="animate-pulse">Eliminando...</span>
                                ) : (
                                    <>
                                        <TrashIcon className="w-4 h-4" />
                                        Eliminar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Cuenta por Cobrar (CxC) */}
            {isCxCModalOpen && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-950/90 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BanknotesIcon className="w-6 h-6 text-brand-400" />
                                {cxcType === 'cxc' ? 'Cuenta por Cobrar' : 'Intercambio'}
                            </h3>
                            <button onClick={() => setIsCxCModalOpen(false)} className="text-brand-400 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-brand-800/50 rounded-xl p-4 border border-brand-700/50">
                                <p className="text-[10px] uppercase font-bold text-brand-400 mb-2">Resumen de Selección</p>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-brand-200">Registros seleccionados:</span>
                                    <span className="text-sm font-bold text-white">{selectedTrxIds.size}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-brand-200">Total a traspasar:</span>
                                    <span className="text-lg font-bold text-brand-400">
                                        {formatMoney(transactions.filter(t => selectedTrxIds.has(t.id)).reduce((acc, t) => acc + (parseCurrency(t.debito) || parseCurrency(t.credito) || 0), 0))}
                                    </span>
                                </div>
                            </div>

                            <div className="flex p-1 bg-brand-800 rounded-xl border border-brand-700">
                                <button
                                    onClick={() => setCxcType('cxc')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${cxcType === 'cxc' ? 'bg-brand-600 text-white shadow-lg' : 'text-brand-400 hover:text-brand-200'}`}
                                >
                                    Cuenta por Cobrar (CxC)
                                </button>
                                <button
                                    onClick={() => setCxcType('intercambio')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${cxcType === 'intercambio' ? 'bg-brand-600 text-white shadow-lg' : 'text-brand-400 hover:text-brand-200'}`}
                                >
                                    Intercambio
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-400 uppercase mb-2">Fuente de Destino (CxC)</label>
                                <SourceDropdown 
                                    options={uniqueSources} 
                                    selected={cxcSource} 
                                    onChange={setCxcSource}
                                    placeholder="Selecciona la fuente que debe"
                                />
                                <p className="text-[10px] text-brand-500 mt-2 italic">
                                    * Se creará un registro de cuenta por cobrar para la fuente seleccionada.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsCxCModalOpen(false)}
                                className="px-4 py-2 bg-brand-800 hover:bg-brand-700 text-brand-200 font-semibold rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveCxC}
                                disabled={isSavingCxC || !cxcSource}
                                className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50"
                            >
                                {isSavingCxC ? (
                                    <span className="animate-pulse">Guardando...</span>
                                ) : (
                                    <>
                                        <SaveIcon className="w-5 h-5" />
                                        Confirmar {cxcType === 'cxc' ? 'CxC' : 'Intercambio'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Factura */}
            {isInvoiceModalOpen && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-950/90 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-brand-900 border border-brand-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CalculatorIcon className="w-6 h-6 text-brand-400" />
                                Generar Factura
                            </h3>
                            <button onClick={() => setIsInvoiceModalOpen(false)} className="text-brand-400 hover:text-white transition-colors">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-400 uppercase mb-2">Número de Factura</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                                    placeholder="Ej: 000123"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-400 uppercase mb-2">Fecha de Factura</label>
                                <input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-400 uppercase mb-2">Hotel</label>
                                <select
                                    value={invoiceHotel}
                                    onChange={(e) => setInvoiceHotel(e.target.value)}
                                    className="w-full bg-brand-800 border border-brand-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-500"
                                >
                                    <option value="Plus">Plus</option>
                                    <option value="Palm">Palm</option>
                                </select>
                            </div>

                            <div className="bg-brand-800/50 rounded-xl p-4 border border-brand-700/50 mt-4 space-y-1">
                                <p className="text-[10px] uppercase font-bold text-brand-400">Monto a Facturar</p>
                                <div className="flex justify-between items-center">
                                    <p className="text-3xl font-bold text-white tracking-tight">
                                        {formatMoney(useAccountNotes ? notesSummary.totalMonto : notesSummary.totalDebito)}
                                    </p>
                                    {useAccountNotes && (
                                        <p className="text-lg font-bold text-brand-400">
                                            {formatMoney(notesSummary.totalBolivares)} Bs
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={() => setIsInvoiceModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-brand-800/50 hover:bg-brand-700/50 text-brand-200 font-bold rounded-xl border border-brand-700/50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveInvoice}
                                disabled={isSavingInvoice || !invoiceNumber}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-950/20 transition-all disabled:opacity-50 transform active:scale-95"
                            >
                                {isSavingInvoice ? (
                                    <span className="animate-pulse">Guardando...</span>
                                ) : (
                                    <>
                                        <SaveIcon className="w-5 h-5" />
                                        Guardar Factura
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};