import { createServerFn } from "@tanstack/react-start";

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    const query = String(input?.query ?? "").trim().slice(0, 200);
    if (query.length < 3) throw new Error("Please enter a longer address");
    return { query };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Maps credentials are not configured");

    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(data.query)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Geocode failed [${res.status}]: ${body}`);
      throw new Error(`Geocoding failed (${res.status})`);
    }

    const json = (await res.json()) as {
      status: string;
      results?: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
    };
    const first = json.results?.[0];
    if (!first) return null;
    return {
      address: first.formatted_address,
      latitude: first.geometry.location.lat,
      longitude: first.geometry.location.lng,
    };
  });