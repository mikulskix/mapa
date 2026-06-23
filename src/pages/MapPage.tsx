import { useState, useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import Header from '../components/Header';
import MapComponent, { type MapMode } from '../components/Map';
import Sidebar from '../components/Sidebar';
import AddMarkerModal from '../components/AddMarkerModal';
import WorkspaceUnlock from '../components/WorkspaceUnlock';
import { useMarkers } from '../hooks/useMarkers';
import { useAuth } from '../context/AuthContext';
import { formatDistance } from '../lib/geo';
import type { MarkerData, MarkerFormData } from '../lib/types';

export default function MapPage() {
  const { workspaceKey, isAdmin } = useAuth();
  const { markers, loading, addMarker, updateMarker, removeMarker, removeAllMarkers, importMarkers, createBackup, listBackups, restoreBackup } = useMarkers();
  const [satellite, setSatellite] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState<MapMode>('default');
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);

  // GPS
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [gpsTracking, setGpsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Navigation
  const [navigateTo, setNavigateTo] = useState<MarkerData | null>(null);
  const [fitBounds, setFitBounds] = useState<[[number, number], [number, number]] | null>(null);

  // Selected marker (highlight from list)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Measure
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  // GPS tracking
  useEffect(() => {
    if (gpsTracking) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        () => { },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [gpsTracking]);

  function handleLocate() {
    if (gpsTracking && userPosition) {
      setFlyTo({ lat: userPosition[0], lng: userPosition[1] });
      setTimeout(() => setFlyTo(null), 1000);
    } else {
      setGpsTracking(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserPosition(p);
          setFlyTo({ lat: p[0], lng: p[1] });
          setTimeout(() => setFlyTo(null), 1000);
        },
        () => alert('Nie udało się pobrać lokalizacji. Sprawdź uprawnienia.')
      );
    }
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (mode === 'add') {
      setPendingPoint({ lat, lng });
      setMode('default');
    } else if (mode === 'measure') {
      setMeasurePoints((prev) => [...prev, [lat, lng]]);
    }
  }, [mode]);

  const handleConfirmAdd = useCallback(
    (name: string, description: string, color: string) => {
      if (!pendingPoint) return;
      addMarker({ name, description, color, lat: pendingPoint.lat, lng: pendingPoint.lng });
      setPendingPoint(null);
    },
    [addMarker, pendingPoint]
  );

  const handleNavigateTo = useCallback((marker: MarkerData) => {
    setSidebarOpen(false);
    const startNav = (pos: [number, number]) => {
      setNavigateTo(marker);
      setFitBounds([pos, [marker.lat, marker.lng]]);
      setTimeout(() => setFitBounds(null), 1000);
    };
    if (!userPosition) {
      setGpsTracking(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserPosition(p);
          startNav(p);
        },
        () => alert('Włącz lokalizację aby nawigować')
      );
    } else {
      startNav(userPosition);
    }
  }, [userPosition]);

  const handleSelectMarker = useCallback((marker: MarkerData) => {
    setSelectedId(marker.id);
    setFlyTo({ lat: marker.lat, lng: marker.lng });
    setSidebarOpen(false);
    setTimeout(() => setFlyTo(null), 1000);
  }, []);

  function handleStopNavigation() {
    setNavigateTo(null);
  }

  function handleToggleMeasure() {
    if (mode === 'measure') {
      setMode('default');
      setMeasurePoints([]);
    } else {
      setMode('measure');
      setMeasurePoints([]);
      setNavigateTo(null);
    }
  }

  function handleUndoMeasure() {
    setMeasurePoints((prev) => prev.slice(0, -1));
  }

  const handleImport = useCallback(
    async (forms: MarkerFormData[]) => {
      return await importMarkers(forms);
    },
    [importMarkers]
  );

  if (!workspaceKey) {
    return <WorkspaceUnlock />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        satellite={satellite}
        onToggleLayer={() => setSatellite((s) => !s)}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <Sidebar markers={markers} isAdmin={isAdmin} selectedId={selectedId} onSelectMarker={handleSelectMarker} onImport={handleImport} onRemoveAll={removeAllMarkers} onCreateBackup={createBackup} onListBackups={listBackups} onRestoreBackup={restoreBackup} onNavigateTo={handleNavigateTo} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-[1050]"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="md:hidden fixed bottom-0 left-0 right-0 h-[60vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl z-[1060] overflow-hidden">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-2 mb-1" />
              <Sidebar markers={markers} isAdmin={isAdmin} selectedId={selectedId} onSelectMarker={handleSelectMarker} onImport={handleImport} onRemoveAll={removeAllMarkers} onCreateBackup={createBackup} onListBackups={listBackups} onRestoreBackup={restoreBackup} onNavigateTo={handleNavigateTo} />
            </aside>
          </>
        )}

        {/* Map */}
        <main className="flex-1 relative z-0">
          <MapComponent
            satellite={satellite}
            markers={markers}
            mode={mode}
            userPosition={userPosition}
            navigateTo={navigateTo}
            measurePoints={measurePoints}
            selectedId={selectedId}
            fitBounds={fitBounds}
            onMapClick={handleMapClick}
            onUpdateMarker={updateMarker}
            onDeleteMarker={removeMarker}
            onNavigateTo={handleNavigateTo}
            flyTo={flyTo}
          />

          {/* Right side buttons */}
          <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 items-center">
            {/* Measure button */}
            <button
              onClick={handleToggleMeasure}
              className={`shadow-lg rounded-full p-3 transition-colors ${
                mode === 'measure'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
              }`}
              title={mode === 'measure' ? 'Zakończ pomiar' : 'Miarka'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21L21 3" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18l2-2M10 14l2-2M14 10l2-2M18 6l2-2" />
              </svg>
            </button>

            {/* Locate button */}
            <button
              onClick={handleLocate}
              className={`shadow-lg rounded-full p-3 transition-colors ${
                gpsTracking
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
              }`}
              title="Moja lokalizacja"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2m10-10h-2M4 12H2" />
              </svg>
            </button>

            {/* Add marker button */}
            <button
              onClick={() => {
                if (mode === 'add') {
                  setMode('default');
                } else {
                  setMode('add');
                  setMeasurePoints([]);
                }
              }}
              className={`shadow-lg rounded-full p-3 transition-colors ${
                mode === 'add'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title={mode === 'add' ? 'Anuluj dodawanie' : 'Dodaj pinezkę'}
            >
              {mode === 'add' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>

          {/* Mode indicators */}
          {mode === 'add' && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
              Kliknij na mapę aby dodać pinezkę
            </div>
          )}

          {mode === 'measure' && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-3">
              <span>Klikaj punkty na mapie aby mierzyć</span>
              {measurePoints.length > 0 && (
                <button
                  onClick={handleUndoMeasure}
                  className="px-2 py-0.5 bg-white/20 rounded text-xs hover:bg-white/30"
                >
                  Cofnij
                </button>
              )}
            </div>
          )}

          {/* Navigation bar */}
          {navigateTo && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-4">
              <div>
                <p className="text-sm font-medium">Nawigacja do: {navigateTo.name}</p>
                {userPosition && (
                  <p className="text-xs opacity-80">
                    {formatDistance(
                      L.latLng(userPosition[0], userPosition[1])
                        .distanceTo(L.latLng(navigateTo.lat, navigateTo.lng))
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={handleStopNavigation}
                className="px-3 py-1 bg-white/20 rounded-md text-sm hover:bg-white/30"
              >
                Zakończ
              </button>
            </div>
          )}
        </main>

        {/* Mobile sidebar toggle */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden fixed bottom-4 left-4 z-[1000] bg-white dark:bg-gray-700 shadow-lg rounded-full p-3 border border-gray-200 dark:border-gray-600"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Add marker modal */}
      {pendingPoint && (
        <AddMarkerModal
          lat={pendingPoint.lat}
          lng={pendingPoint.lng}
          onConfirm={handleConfirmAdd}
          onCancel={() => setPendingPoint(null)}
        />
      )}
    </div>
  );
}
