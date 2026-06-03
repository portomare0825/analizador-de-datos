// This script assumes SheetJS (xlsx) is loaded from a CDN.
declare var XLSX: any;

export const parseFileToJSON = (file: File): Promise<{ data: Record<string, any>[]; headers: string[]; }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        if (!event.target?.result) {
          throw new Error('No se pudo leer el archivo.');
        }

        const data = new Uint8Array(event.target.result as ArrayBuffer);
        // Use cellDates: true to parse dates into JS Date objects directly. This is much more reliable.
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('No se encontraron hojas en el libro de trabajo.');
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

        if (!jsonData || jsonData.length === 0) {
            throw new Error('La hoja seleccionada está vacía o no se pudo convertir.');
        }

        const headers = Object.keys(jsonData[0] || {});
        
        resolve({
          data: jsonData,
          headers,
        });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(new Error('Error al leer el archivo: ' + error));
    };

    reader.readAsArrayBuffer(file);
  });
};