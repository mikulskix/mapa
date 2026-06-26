import { useState, useEffect, useCallback } from 'react';

type OrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };

interface Props {
  movementHeading?: number | null;
}

export default function Compass({ movementHeading }: Props) {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  const handleOrientation = useCallback((ev: Event) => {
    const e = ev as OrientationEvent;
    let h: number | null = null;
    if (typeof e.webkitCompassHeading === 'number') {
      h = e.webkitCompassHeading;
    } else if (e.alpha != null) {
      h = 360 - e.alpha;
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
      setNeedsPermission(true);
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
    } catch { /* user denied */ }
  }, [start]);

  const compassRotation = heading == null ? 0 : -heading;

  // Movement arrow: rotated relative to compass so it points the right way on screen.
  // movementHeading is absolute (0=north), compass rotates by -heading,
  // so arrow needs movementHeading - heading to appear correct on the rotated dial.
  const movementRotation =
    movementHeading != null && heading != null
      ? movementHeading - heading
      : movementHeading ?? null;

  return (
    <button
      onClick={needsPermission ? requestPerm : undefined}
      className="relative w-[88px] h-[88px] rounded-full shadow-lg flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)' }}
      title={needsPermission ? 'Dotknij, aby włączyć kompas' : 'Kompas'}
      aria-label="Kompas"
    >
      {/* Compass rose — rotates with device orientation */}
      <div style={{ transform: `rotate(${compassRotation}deg)`, transition: 'transform 0.15s ease-out', position: 'absolute' }}>
        <svg width="60" height="60" viewBox="0 0 30 30">
          <polygon points="15,3 19,15 15,12 11,15" fill="#dc2626" />
          <polygon points="15,27 19,15 15,18 11,15" fill="#9ca3af" />
          <circle cx="15" cy="15" r="1.6" fill="#374151" />
        </svg>
      </div>

      {/* Movement arrow — blue, thin, points in direction of travel */}
      {movementRotation != null && (
        <div style={{ transform: `rotate(${movementRotation}deg)`, transition: 'transform 0.2s ease-out', position: 'absolute' }}>
          <svg width="60" height="60" viewBox="0 0 30 30">
            <polygon points="15,5 17.5,21 15,19 12.5,21" fill="#2563eb" stroke="white" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {needsPermission && (
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">!</span>
      )}
    </button>
  );
}
