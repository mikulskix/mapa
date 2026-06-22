export interface MarkerData {
  id: string;
  name: string;
  description: string;
  color: string;
  lat: number;
  lng: number;
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedMarker {
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

export interface MarkerFormData {
  name: string;
  description: string;
  color: string;
  lat: number;
  lng: number;
}

export const MARKER_COLORS = [
  { name: 'Czerwony', value: '#ef4444' },
  { name: 'Niebieski', value: '#3b82f6' },
  { name: 'Zielony', value: '#22c55e' },
  { name: 'Żółty', value: '#eab308' },
  { name: 'Fioletowy', value: '#a855f7' },
  { name: 'Pomarańczowy', value: '#f97316' },
  { name: 'Różowy', value: '#ec4899' },
  { name: 'Turkusowy', value: '#06b6d4' },
] as const;
