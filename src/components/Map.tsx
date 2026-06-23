import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMapEvents, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import type { MarkerData, MarkerFormData } from '../lib/types';
import { formatDistance } from '../lib/geo';
import MarkerPopup from './MarkerPopup';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SAT_ATTR = '&copy; Esri';

function createDotIcon(color: string, selected = false) {
  if (selected) {
    return L.divIcon({
      className: '',
      html: `<div class="marker-selected"><div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 3px #3b82f6,0 1px 6px rgba(0,0,0,0.5);"></div></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -12],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const userLocationIcon = L.divIcon({
  className: '',
  html: `<div class="user-loc-pulse"><div class="user-loc-ring"></div><div class="user-loc-dot"></div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export type MapMode = 'default' | 'add' | 'measure';

interface Props {
  satellite: boolean;
  markers: MarkerData[];
  mode: MapMode;
  userPosition: [number, number] | null;
  navigateTo: MarkerData | null;
  measurePoints: [number, number][];
  selectedId: string | null;
  fitBounds: [[number, number], [number, number]] | null;
  onMapClick: (lat: number, lng: number) => void;
  onUpdateMarker: (id: string, data: MarkerFormData) => void;
  onDeleteMarker: (id: string) => void;
  onNavigateTo: (marker: MarkerData) => void;
  flyTo: { lat: number; lng: number } | null;
}

const MAP_VIEW_KEY = 'map-view';

function SaveViewHandler() {
  const map = useMap();
  useEffect(() => {
    function save() {
      const c = map.getCenter();
      localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
    }
    map.on('moveend', save);
    return () => { map.off('moveend', save); };
  }, [map]);
  return null;
}

function ZoomLabelScaler() {
  const map = useMap();
  useEffect(() => {
    function updateSize() {
      const zoom = map.getZoom();
      const size = zoom <= 8 ? 10 : zoom <= 12 ? 11 : zoom <= 14 ? 12 : zoom <= 16 ? 14 : 16;
      document.documentElement.style.setProperty('--marker-label-size', `${size}px`);
    }
    updateSize();
    map.on('zoomend', updateSize);
    return () => { map.off('zoomend', updateSize); };
  }, [map]);
  return null;
}

function ClickHandler({ mode, onMapClick }: { mode: MapMode; onMapClick: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      if (mode === 'add' || mode === 'measure') {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = mode === 'add' ? 'crosshair' : mode === 'measure' ? 'crosshair' : '';
    return () => { container.style.cursor = ''; };
  }, [mode, map]);

  return null;
}

function FlyToHandler({ flyTo }: { flyTo: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], 15, { duration: 0.8 });
    }
  }, [flyTo, map]);
  return null;
}

function FitBoundsHandler({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [70, 70], maxZoom: 16, duration: 0.8 });
    }
  }, [bounds, map]);
  return null;
}

function ColorMarker({ marker, selected, onUpdate, onDelete, onNavigate }: {
  marker: MarkerData;
  selected: boolean;
  onUpdate: (id: string, data: MarkerFormData) => void;
  onDelete: (id: string) => void;
  onNavigate: (marker: MarkerData) => void;
}) {
  const icon = useMemo(() => createDotIcon(marker.color || '#ef4444', selected), [marker.color, selected]);

  return (
    <Marker position={[marker.lat, marker.lng]} icon={icon}>
      <Tooltip
        direction="top"
        offset={[0, -10]}
        permanent
        className="marker-label"
      >
        {marker.name}
      </Tooltip>
      <Popup>
        <MarkerPopup marker={marker} onUpdate={onUpdate} onDelete={onDelete} onNavigate={onNavigate} />
      </Popup>
    </Marker>
  );
}

function NavigationLine({ from, to }: { from: [number, number]; to: MarkerData }) {
  const dist = L.latLng(from[0], from[1]).distanceTo(L.latLng(to.lat, to.lng));
  const midLat = (from[0] + to.lat) / 2;
  const midLng = (from[1] + to.lng) / 2;

  return (
    <>
      <Polyline
        positions={[from, [to.lat, to.lng]]}
        pathOptions={{ color: '#ff6d00', weight: 5, dashArray: '1, 12', lineCap: 'round' }}
      />
      <CircleMarker center={[midLat, midLng]} radius={0}>
        <Tooltip direction="center" permanent className="distance-label">
          {formatDistance(dist)}
        </Tooltip>
      </CircleMarker>
    </>
  );
}

function MeasureLines({ points }: { points: [number, number][] }) {
  if (points.length < 2) return null;

  const segments: { from: [number, number]; to: [number, number]; dist: number }[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = L.latLng(points[i - 1][0], points[i - 1][1]).distanceTo(
      L.latLng(points[i][0], points[i][1])
    );
    total += d;
    segments.push({ from: points[i - 1], to: points[i], dist: d });
  }

  return (
    <>
      <Polyline
        positions={points}
        pathOptions={{ color: '#f97316', weight: 3 }}
      />
      {segments.map((s, i) => {
        const midLat = (s.from[0] + s.to[0]) / 2;
        const midLng = (s.from[1] + s.to[1]) / 2;
        return (
          <CircleMarker key={i} center={[midLat, midLng]} radius={0}>
            <Tooltip direction="center" permanent className="distance-label">
              {formatDistance(s.dist)}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {points.length > 2 && (
        <CircleMarker center={points[points.length - 1]} radius={0}>
          <Tooltip direction="bottom" permanent className="distance-label-total">
            Suma: {formatDistance(total)}
          </Tooltip>
        </CircleMarker>
      )}
    </>
  );
}

function getSavedView(): { center: [number, number]; zoom: number } {
  try {
    const raw = localStorage.getItem(MAP_VIEW_KEY);
    if (raw) {
      const { lat, lng, zoom } = JSON.parse(raw);
      if (typeof lat === 'number' && typeof lng === 'number' && typeof zoom === 'number') {
        return { center: [lat, lng], zoom };
      }
    }
  } catch { /* ignore */ }
  return { center: [51.9194, 19.1451], zoom: 6 };
}

export default function Map({
  satellite, markers, mode, userPosition, navigateTo, measurePoints, selectedId, fitBounds,
  onMapClick, onUpdateMarker, onDeleteMarker, onNavigateTo, flyTo,
}: Props) {
  const saved = getSavedView();
  return (
    <MapContainer
      center={saved.center}
      zoom={saved.zoom}
      className="h-full w-full"
    >
      <TileLayer
        key={satellite ? 'sat' : 'osm'}
        url={satellite ? SAT_URL : OSM_URL}
        attribution={satellite ? SAT_ATTR : OSM_ATTR}
      />
      <SaveViewHandler />
      <ZoomLabelScaler />
      <ClickHandler mode={mode} onMapClick={onMapClick} />
      <FlyToHandler flyTo={flyTo} />
      <FitBoundsHandler bounds={fitBounds} />

      {userPosition && (
        <Marker position={userPosition} icon={userLocationIcon}>
          <Tooltip direction="top" offset={[0, -12]} className="marker-label">
            Twoja pozycja
          </Tooltip>
        </Marker>
      )}

      {markers.map((m) => (
        <ColorMarker
          key={m.id}
          marker={m}
          selected={selectedId === m.id}
          onUpdate={onUpdateMarker}
          onDelete={onDeleteMarker}
          onNavigate={onNavigateTo}
        />
      ))}

      {navigateTo && userPosition && (
        <NavigationLine from={userPosition} to={navigateTo} />
      )}

      {measurePoints.length > 0 && measurePoints.map((p, i) => (
        <CircleMarker key={i} center={p} radius={5} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 1 }} />
      ))}

      <MeasureLines points={measurePoints} />
    </MapContainer>
  );
}
