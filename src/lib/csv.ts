import Papa from 'papaparse';
import type { MarkerData, MarkerFormData } from './types';

interface CsvRow {
  name: string;
  latitude: string;
  longitude: string;
  description?: string;
  color?: string;
}

export function parseCsv(file: File): Promise<{ valid: MarkerFormData[]; invalidCount: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const valid: MarkerFormData[] = [];
        let invalidCount = 0;

        for (const row of results.data) {
          const lat = parseFloat(row.latitude);
          const lng = parseFloat(row.longitude);
          const name = row.name?.trim();

          if (!name || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            invalidCount++;
            continue;
          }

          // Default to blue; also treat the legacy red default as "no color"
          const csvColor = row.color?.trim().toLowerCase();
          const color = (!csvColor || csvColor === '#ef4444') ? '#3b82f6' : csvColor;

          valid.push({
            name,
            description: row.description?.trim() || '',
            color,
            lat,
            lng,
          });
        }

        resolve({ valid, invalidCount });
      },
      error: reject,
    });
  });
}

export function exportCsv(markers: MarkerData[]): void {
  const data = markers.map((m) => ({
    name: m.name,
    latitude: m.lat,
    longitude: m.lng,
    description: m.description,
    color: m.color || '#ef4444',
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'markers.csv';
  a.click();
  URL.revokeObjectURL(url);
}
