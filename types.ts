
export type Status = 'idle' | 'loading' | 'display' | 'success' | 'error';

export type DataRow = Record<string, any>;

export interface AppState {
  status: Status;
  error: string | null;
  fileName: string | null;
  rawData: DataRow[] | null;
  displayData: DataRow[] | null;
  headers: string[] | null;
  originalHeaderMap: Record<string, string> | null;
}

export interface Filters {
  source: string;
  status: string; // Mapped to 'Estado de la Habitacion'
  originalStatus: string; // Mapped to 'Estado Ciudad'
  arrivalDateStart: string;
  arrivalDateEnd: string;
  departureDateStart: string;
  departureDateEnd: string;
  reservationSearch: string;
  cancelledFilter: 'hidden' | 'all' | 'only'; // 'hidden': ocultas (default), 'all': todas, 'only': solo canceladas
}

export interface SummaryData {
  recordCount: number;
  totalAdults: number;
  totalChildren: number;
  totalRooms: number;
}

export interface SourceSummary {
  source: string;
  totalRooms: number;
  totalAdults: number;
  totalChildren: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
