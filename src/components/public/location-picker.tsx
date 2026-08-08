"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";

// Leaflet'ni CDN orqali bir marta yuklaymiz (npm paket qo'shmasdan).
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    // JS
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      if (window.L) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const TASHKENT: [number, number] = [41.311081, 69.240562];

export function LocationPicker({
  value,
  onChange,
  accent,
  labels,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  accent: string;
  labels: { myLocation: string; pickOnMap: string; addressPicked: string };
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const L = window.L;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        const start = value ?? { lat: TASHKENT[0], lng: TASHKENT[1] };
        const map = L.map(mapEl.current).setView([start.lat, start.lng], value ? 16 : 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;

        if (value) {
          markerRef.current = L.marker([value.lat, value.lng]).addTo(map);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          placeMarker(lat, lng);
          onChangeRef.current(lat, lng);
        });

        // Konteyner o'lchami kechroq aniqlanishi mumkin — qayta hisoblaymiz
        setTimeout(() => map.invalidateSize(), 200);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(lat: number, lng: number) {
    const L = window.L;
    if (!mapRef.current || !L) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 16);
        placeMarker(latitude, longitude);
        onChangeRef.current(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div ref={mapEl} className="h-56 w-full bg-surface-2" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {value ? (
            <span className="font-medium text-success">
              ✓ {labels.addressPicked} ({value.lat.toFixed(6)}, {value.lng.toFixed(6)})
            </span>
          ) : (
            labels.pickOnMap
          )}
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-soft active:scale-[0.98]"
          style={{ color: accent }}
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          {labels.myLocation}
        </button>
      </div>
    </div>
  );
}
