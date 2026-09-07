import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
    __civictrackReportMapInit?: () => void;
  }
}

const BROWSER_KEY = import.meta.env[
  "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"
] as string | undefined;

const CHANNEL = import.meta.env[
  "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"
] as string | undefined;

let loader: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.maps?.Map) {
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
    `&libraries=places` +
    `&loading=async&callback=__civictrackReportMapInit` +
    `${CHANNEL ? `&channel=${CHANNEL}` : ""}`;

    script.async = true;

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps"));
    };

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

export function ReportLocationMap({
  latitude,
  longitude,
  onLocationSelect,
}: ReportLocationMapProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const updateLocationFromLatLng = (
    selectedLatitude: number,
    selectedLongitude: number,
    moveMap = true,
  ) => {
    if (!window.google?.maps || !geocoderRef.current) {
      return;
    }

    const position = {
      lat: selectedLatitude,
      lng: selectedLongitude,
    };

    if (moveMap && mapRef.current) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(16);
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: true,
        title: "Selected garbage location",
      });

      markerRef.current.addListener("dragend", () => {
        const markerPosition = markerRef.current?.getPosition();

        if (!markerPosition) {
          return;
        }

        updateLocationFromLatLng(
          markerPosition.lat(),
          markerPosition.lng(),
          false,
        );
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }

    geocoderRef.current.geocode(
      { location: position },
      (results: any[], status: string) => {
        if (status === "OK" && results?.[0]) {
          const formattedAddress = results[0].formatted_address;

          setAddress(formattedAddress);

          onLocationSelect(
            selectedLatitude,
            selectedLongitude,
            formattedAddress,
          );
        } else {
          setAddress("Location selected");

          onLocationSelect(
            selectedLatitude,
            selectedLongitude,
            "Location selected",
          );
        }
      },
    );
  };

  useEffect(() => {
    let cancelled = false;

    loadMaps()
      .then(() => {
        if (cancelled || !window.google) {
          return;
        }

        if (!mapRef.current) {
          const initialCenter =
            latitude != null && longitude != null
              ? {
                  lat: latitude,
                  lng: longitude,
                }
              : {
                  lat: 20,
                  lng: 0,
                };

          mapRef.current = new window.google.maps.Map(
            document.getElementById("civictrack-report-map"),
            {
              center: initialCenter,
              zoom: latitude != null ? 15 : 2,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              zoomControl: true,
            },
          );

          geocoderRef.current = new window.google.maps.Geocoder();

          mapRef.current.addListener("click", (event: any) => {
            if (!event.latLng) {
              return;
            }

            updateLocationFromLatLng(
              event.latLng.lat(),
              event.latLng.lng(),
            );
          });

          if (searchInputRef.current) {
            autocompleteRef.current =
              new window.google.maps.places.Autocomplete(
                searchInputRef.current,
                {
                  fields: [
                    "formatted_address",
                    "geometry",
                    "name",
                  ],
                  types: ["geocode"],
                },
              );

            autocompleteRef.current.addListener(
              "place_changed",
              () => {
                const place =
                  autocompleteRef.current?.getPlace();

                if (
                  !place?.geometry?.location
                ) {
                  return;
                }

                const selectedLatitude =
                  place.geometry.location.lat();

                const selectedLongitude =
                  place.geometry.location.lng();

                const selectedAddress =
                  place.formatted_address ||
                  place.name ||
                  "Selected location";

                  const placeId = place.place_id;

                setSearchValue(selectedAddress);
                setAddress(selectedAddress);

                if (mapRef.current) {
                  mapRef.current.panTo({
                    lat: selectedLatitude,
                    lng: selectedLongitude,
                  });

                  mapRef.current.setZoom(16);
                }

                if (!markerRef.current) {
                  markerRef.current =
                    new window.google.maps.Marker({
                      position: {
                        lat: selectedLatitude,
                        lng: selectedLongitude,
                      },
                      map: mapRef.current,
                      draggable: true,
                      title: "Selected garbage location",
                    });

                  markerRef.current.addListener(
                    "dragend",
                    () => {
                      const markerPosition =
                        markerRef.current?.getPosition();

                      if (!markerPosition) {
                        return;
                      }

                      updateLocationFromLatLng(
                        markerPosition.lat(),
                        markerPosition.lng(),
                        false,
                      );
                    },
                  );
                } else {
                  markerRef.current.setPosition({
                    lat: selectedLatitude,
                    lng: selectedLongitude,
                  });

                  markerRef.current.setMap(
                    mapRef.current,
                  );
                }

                onLocationSelect(
                  selectedLatitude,
                  selectedLongitude,
                  selectedAddress,
                  placeId,
                );
              },
            );
          }

          setMapReady(true);

          if (latitude != null && longitude != null) {
            updateLocationFromLatLng(
              latitude,
              longitude,
            );
          }
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          console.error(e);
          setError(e.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !mapReady ||
      latitude == null ||
      longitude == null ||
      !mapRef.current
    ) {
      return;
    }

    const position = {
      lat: latitude,
      lng: longitude,
    };

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: true,
        title: "Selected garbage location",
      });

      markerRef.current.addListener("dragend", () => {
        const markerPosition =
          markerRef.current?.getPosition();

        if (!markerPosition) {
          return;
        }

        updateLocationFromLatLng(
          markerPosition.lat(),
          markerPosition.lng(),
          false,
        );
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }

    mapRef.current.panTo(position);
    mapRef.current.setZoom(16);
  }, [latitude, longitude, mapReady]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Location is not supported by your browser.",
      );
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoadingLocation(false);

        updateLocationFromLatLng(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      (locationError) => {
        setLoadingLocation(false);

        console.error(locationError);

        setError(
          "Unable to get your current location. Please allow location access.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="surface-card flex min-h-[120px] items-center justify-center rounded-xl p-6 text-center text-sm text-muted-foreground">
          {error}
        </div>

        <button
          type="button"
          onClick={() => setError(null)}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(e) =>
            setSearchValue(e.target.value)
          }
          placeholder="Search for a location..."
          className="h-11 w-full rounded-lg border border-input bg-background px-4 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Current location */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={loadingLocation}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        📍{" "}
        {loadingLocation
          ? "Getting your location..."
          : "Use my current location"}
      </button>

      {/* Map */}
      <div
        id="civictrack-report-map"
        className="h-[380px] w-full overflow-hidden rounded-xl border border-border bg-muted"
      />

      {/* Selected address */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">
          Selected location
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          {address ||
            "Search for a place, use your current location, or click on the map."}
        </p>
      </div>
    </div>
  );
}