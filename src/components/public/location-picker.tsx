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

// Tashqi rasmga bog'liq bo'lmagan, doim ko'rinadigan pin (SVG).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePin(L: any, color: string) {
  return L.divIcon({
    className: "ozf-pin",
    html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="${color}"/>
      <circle cx="17" cy="17" r="6.5" fill="#fff"/>
    </svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
  });
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const L = window.L;
        iconRef.current = makePin(L, accent || "#e11d48");
        const start = value ?? { lat: TASHKENT[0], lng: TASHKENT[1] };
        const map = L.map(mapEl.current, { zoomControl: true }).setView(
          [start.lat, start.lng],
          value ? 16 : 13
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;

        if (value) {
          markerRef.current = L.marker([value.lat, value.lng], { icon: iconRef.current }).addTo(map);
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
      markerRef.current = L.marker([lat, lng], { icon: iconRef.current }).addTo(mapRef.current);
    }
  }

  function useMyLocation() {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Brauzer joylashuvni qo'llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 17);
        placeMarker(latitude, longitude);
        onChangeRef.current(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1
            ? "Joylashuvga ruxsat berilmadi. Brauzer sozlamasidan ruxsat bering."
            : "Joylashuvni aniqlab bo'lmadi. Xaritadan qo'lda tanlang."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
      {geoError && <p className="text-xs text-error">{geoError}</p>}
    </div>
  );
}
