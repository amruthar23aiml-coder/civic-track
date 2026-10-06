import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, LocateFixed, MapPin, Search } from "lucide-react";

declare global {
  interface Window {
    google?: any;
    __civictrackReportMapInit?: () => void;
  }
}

const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
  string | undefined;
const CHANNEL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
  string | undefined;

let loader: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined" || window.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (loader) {
    return loader;
  }

  loader = new Promise<void>((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("Missing Google Maps browser key"));
      return;
    }

    window.__civictrackReportMapInit = () => resolve();
    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}` +
      `&libraries=places&loading=async&callback=__civictrackReportMapInit` +
      `${CHANNEL ? `&channel=${CHANNEL}` : ""}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loader;
}

type ReportLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (
    latitude: number,
    longitude: number,
    address: string,
    placeId?: string,
  ) => void;
};

type PendingLocation = {
  latitude: number;
  longitude: number;
  address: string;
  placeId?: string;
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function ReportLocationMap({
  latitude,
  longitude,
  onLocationSelect,
}: ReportLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const reverseGeocodeTimerRef = useRef<number | null>(null);
  const lastExternalLocationRef = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const reverseGeocodeCenter = () => {
    if (!mapRef.current || !geocoderRef.current) {
      return;
    }

    const center = mapRef.current.getCenter();
    if (!center) {
      return;
    }

    const nextLatitude = center.lat();
    const nextLongitude = center.lng();
    setGeocoding(true);

    geocoderRef.current.geocode(
      { location: { lat: nextLatitude, lng: nextLongitude } },
      (results: any[], status: string) => {
        setGeocoding(false);
        const formattedAddress =
          status === "OK" && results?.[0]?.formatted_address ? results[0].formatted_address : "";

        if (!formattedAddress) {
          setError(
            "We could not find a readable address here. Move the map slightly or search for a nearby place.",
          );
        } else {
          setError(null);
        }
        setAddress(formattedAddress);
        setPendingLocation({
          latitude: nextLatitude,
          longitude: nextLongitude,
          address: formattedAddress,
        });
        setConfirmed(false);
      },
    );
  };

  const scheduleReverseGeocode = () => {
    if (reverseGeocodeTimerRef.current !== null) {
      window.clearTimeout(reverseGeocodeTimerRef.current);
    }

    reverseGeocodeTimerRef.current = window.setTimeout(reverseGeocodeCenter, 450);
  };

  const moveToLocation = (nextLatitude: number, nextLongitude: number, zoom = 17) => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.panTo({
      lat: nextLatitude,
      lng: nextLongitude,
    });
    mapRef.current.setZoom(zoom);
  };

  const updateMarker = (position: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google?.maps) {
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: true,
        title: "Fine-tune selected location",
        opacity: 0.75,
      });

      markerRef.current.addListener("dragend", () => {
        const markerPosition = markerRef.current?.getPosition();
        if (!markerPosition) {
          return;
        }

        moveToLocation(markerPosition.lat(), markerPosition.lng());
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }
  };

  useEffect(() => {
    let cancelled = false;

    loadMaps()
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.google) {
          return;
        }

        const initialCenter =
          latitude !== null && longitude !== null
            ? { lat: latitude, lng: longitude }
            : { lat: 20, lng: 0 };

        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: latitude !== null ? 17 : 2,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        geocoderRef.current = new window.google.maps.Geocoder();
        setMapReady(true);

        mapRef.current.addListener("idle", scheduleReverseGeocode);

        if (searchInputRef.current && window.google.maps.places?.Autocomplete) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
            {
              fields: ["formatted_address", "geometry", "name", "place_id"],
              types: ["geocode", "establishment"],
            },
          );

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace();
            if (!place?.geometry?.location) {
              setError("No location result was found. Try a nearby landmark or address.");
              return;
            }

            const selectedAddress = place.formatted_address || place.name || "";
            const selectedLatitude = place.geometry.location.lat();
            const selectedLongitude = place.geometry.location.lng();

            setSearchValue(selectedAddress);
            setAddress(selectedAddress);
            setPendingLocation({
              latitude: selectedLatitude,
              longitude: selectedLongitude,
              address: selectedAddress,
              placeId: place.place_id,
            });
            setConfirmed(false);
            setError(null);
            updateMarker({
              lat: selectedLatitude,
              lng: selectedLongitude,
            });
            moveToLocation(selectedLatitude, selectedLongitude);
          });
        }

        if (latitude !== null && longitude !== null) {
          updateMarker({ lat: latitude, lng: longitude });
          setPendingLocation({
            latitude,
            longitude,
            address: "",
          });
          moveToLocation(latitude, longitude);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          console.error(loadError);
          setError(loadError.message);
        }
      });

    return () => {
      cancelled = true;
      if (reverseGeocodeTimerRef.current !== null) {
        window.clearTimeout(reverseGeocodeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || latitude === null || longitude === null) {
      return;
    }

    const externalLocation = `${latitude}:${longitude}`;
    if (lastExternalLocationRef.current === externalLocation) {
      return;
    }

    lastExternalLocationRef.current = externalLocation;
    updateMarker({ lat: latitude, lng: longitude });
    moveToLocation(latitude, longitude);
  }, [latitude, longitude, mapReady]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by your browser.");
      return;
    }

    setLoadingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoadingLocation(false);
        moveToLocation(position.coords.latitude, position.coords.longitude);
        updateMarker({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (locationError) => {
        setLoadingLocation(false);
        console.error(locationError);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. You can search for a place instead."
            : "Unable to get your current location. Please try again or search manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const handleConfirm = () => {
    if (!pendingLocation || !address.trim()) {
      setError("Move the map until a readable address is found before confirming.");
      return;
    }

    onLocationSelect(
      pendingLocation.latitude,
      pendingLocation.longitude,
      pendingLocation.address,
      pendingLocation.placeId,
    );
    setConfirmed(true);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search an address, landmark, or locality..."
          className="h-11 w-full rounded-xl border border-white/10 bg-background/60 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={loadingLocation}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 text-sm font-medium text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingLocation ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LocateFixed className="size-4" />
        )}
        {loadingLocation ? "Getting your location..." : "Use my current location"}
      </button>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-muted sm:h-[380px]"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <div className="flex size-11 items-center justify-center rounded-full border-2 border-primary bg-primary/15 shadow-sm">
            <Crosshair className="size-6 text-primary" />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-black/10 bg-background/85 px-3 py-1.5 text-center text-xs text-muted-foreground shadow-lg backdrop-blur">
          Move the map to place the crosshair exactly on the issue
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Selected location</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {geocoding
                ? "Finding the address..."
                : address || "Search for a place or move the map to select a location."}
            </p>
            {pendingLocation && (
              <p className="mt-2 text-xs text-muted-foreground">
                Latitude {formatCoordinate(pendingLocation.latitude)} · Longitude{" "}
                {formatCoordinate(pendingLocation.longitude)}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={geocoding || !pendingLocation || !address.trim()}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover hover:text-primary-hover-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmed ? "Location selected" : "Confirm this location"}
        </button>
        {confirmed && (
          <p className="mt-2 text-center text-xs font-medium text-primary">
            This location will be used for your report or event.
          </p>
        )}
      </div>
    </div>
  );
}
