import { useState, useEffect, useCallback } from 'react';

type OrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };

export default function Compass() {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  const handleOrientation = useCallback((ev: Event) => {
    const e = ev as OrientationEvent;
    let h: number | null = null;
    if (typeof e.webkitCompassHeading === 'number') {
      h = e.webkitCompassHeading; // iOS: compass heading, 0 = north, clockwise
    } else if (e.alpha != null) {
      h = 360 - e.alpha; // others: alpha increases counter-clockwise
    }
    if (h != null && !isNaN(h)) {
      setHeading(((h % 360) + 360) % 360);
    }
  }, []);

  const start = useCallback(() => {
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientation);
  }, [handleOrientation]);

  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE && typeof DOE.requestPermission === 'function') {
      setNeedsPermission(true); // iOS — requires a tap to grant
    } else {
      start();
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [start, handleOrientation]);

  const requestPerm = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      const res = await DOE.requestPermission?.();
      if (res === 'granted') {
        setNeedsPermission(false);
        start();
      }
    } catch {
      // user denied or unavailable
    }
  }, [start]);

  const rotation = heading == null ? 0 : -heading;

  return (
    <button
      onClick={needsPermission ? requestPerm : undefined}
      className="relative w-11 h-11 rounded-full bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center"
      title={needsPermission ? 'Dotknij, aby włączyć kompas' : 'Kompas'}
      aria-label="Kompas"
    >
      <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.15s ease-out' }}>
        <svg width="30" height="30" viewBox="0 0 30 30">
          {/* North needle (red) + South needle (grey) */}
          <polygon points="15,3 19,15 15,12 11,15" fill="#dc2626" />
          <polygon points="15,27 19,15 15,18 11,15" fill="#9ca3af" />
          <circle cx="15" cy="15" r="1.6" fill="#374151" />
        </svg>
      </div>
      {needsPermission && (
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">!</span>
      )}
    </button>
  );
}
