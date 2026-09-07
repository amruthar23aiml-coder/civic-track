import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { EventWithRegs } from "@/lib/data";

declare global {
  interface Window {
    google?: any;
    __cleansweepMapInit?: () => void;
  }
}

const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
const CHANNEL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;

let loader: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("Missing Google Maps browser key"));
      return;
    }
    window.__cleansweepMapInit = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__cleansweepMapInit${
      CHANNEL ? `&channel=${CHANNEL}` : ""
    }`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loader;
}

export default function EventsMap({
  events,
  className,
}: {
  events: EventWithRegs[];
  className?: string | undefined;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(ref.current, {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            mapTypeControl: false,
            streetViewControl: false,
          });
        }
        const map = mapRef.current;
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        const located = events.filter((e) => e.latitude != null && e.longitude != null);
        const bounds = new window.google.maps.LatLngBounds();
        const info = new window.google.maps.InfoWindow();
        located.forEach((e) => {
          const position = { lat: Number(e.latitude), lng: Number(e.longitude) };
          const marker = new window.google.maps.Marker({ position, map, title: e.title });
          marker.addListener("click", () => {
            info.setContent(
              `<div style="font-family:sans-serif;max-width:220px"><strong>${e.title}</strong><br/>${format(
                new Date(e.starts_at),
                "d MMM yyyy HH:mm",
              )}<br/>${e.location_name}<br/><a href="/events/${e.id}">View event</a></div>`,
            );
            info.open({ anchor: marker, map });
          });
          markersRef.current.push(marker);
          bounds.extend(position);
        });
        if (located.length === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(13);
        } else if (located.length > 1) {
          map.fitBounds(bounds, 48);
        }
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [events]);

  if (error) {
    return (
      <div className={`surface-card flex items-center justify-center p-8 text-sm text-muted-foreground ${className ?? ""}`}>
        Map unavailable right now.
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-2xl border border-border bg-muted ${className ?? ""}`} />;
}