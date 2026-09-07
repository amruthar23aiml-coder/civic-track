import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { ReportLocationMap } from "@/components/ReportLocationMap";
export const Route = createFileRoute("/_authenticated/report")({
  component: ReportGarbage,
});

function ReportGarbage() {
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
   "garbage" | "plastic" | "construction_waste" | "overflowing_bin" | "illegal_dumping" | "other" | ""
   >("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    toast.error("Location is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);

      toast.success("Your current location has been selected.");
    },
    () => {
      toast.error("Unable to get your location. Please allow location access.");
    }
  );
}; 

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!photo) {
    toast.error("Please upload a photo of the garbage.");
    return;
  }

  if (!category) {
    toast.error("Please select a garbage category.");
    return;
  }

  try {
    const fileExt = photo.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("report-photos")
      .upload(fileName, photo);

    if (uploadError) {
      console.error(uploadError);
      toast.error("Photo upload failed.");
      return;
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      toast.error("You must be logged in to submit a report.");
      return;
    }
    
   const mapsLink =
      placeId
        ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
        : latitude != null && longitude != null
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : null;

    const { error: reportError } = await supabase
      .from("reports")
      .insert({
        user_id: userData.user.id,
        title: "Garbage Report",
        description,
        category,
        location_name: location,
        address: address,
        latitude,
        longitude,
        before_image_url: fileName,
        maps_link: mapsLink,
      });

    if (reportError) {
      console.error(reportError);
      toast.error("Could not create the garbage report.");
      return;
    }

    toast.success("Garbage report submitted successfully!");
  } catch (error) {
    console.error(error);
    toast.error("Something went wrong.");
  }
} 

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/dashboard" })}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <span className="font-medium">Community Action</span>
          </div>

          <h1 className="text-3xl font-bold">
            Report Garbage
          </h1>

          <p className="mt-2 text-muted-foreground">
            Help your community by reporting garbage that needs to be
            cleaned.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="surface-card space-y-6 p-6"
        >
          <div className="space-y-2">
  <Label htmlFor="photo">
    Garbage Photo
  </Label>

  <label
    htmlFor="photo"
    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition hover:bg-muted/50"
  >
    {photo ? (
      <>
        <img
          src={URL.createObjectURL(photo)}
          alt="Selected garbage"
          className="mb-4 max-h-64 w-full rounded-lg object-cover"
        />

        <span className="font-medium">
          {photo.name}
        </span>

        <span className="mt-1 text-sm text-muted-foreground">
          Click to choose a different photo
        </span>
      </>
    ) : (
      <>
        <Camera className="mb-3 h-8 w-8 text-muted-foreground" />

        <span className="font-medium">
          Upload a photo
        </span>

        <span className="mt-1 text-sm text-muted-foreground">
          Take a photo or choose one from your device
        </span>
      </>
    )}

    <Input
      id="photo"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) =>
        setPhoto(e.target.files?.[0] ?? null)
      }
    />
  </label>
</div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Garbage Category
            </Label>

            <select
              id="category"
              value={category}
              onChange={(e) =>
  setCategory(
    e.target.value as
      | "garbage"
      | "plastic"
      | "construction_waste"
      | "overflowing_bin"
      | "illegal_dumping"
      | "other"
      | ""
  )
}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">
                Select category
              </option>
              <option value="garbage">
              Garbage
            </option>
            <option value="plastic">
              Plastic Waste
            </option>
            <option value="construction_waste">
              Construction Waste
            </option>
            <option value="overflowing_bin">
              Overflowing Bin
            </option>
            <option value="illegal_dumping">
              Illegal Dumping
            </option>
            <option value="other">
              Other
            </option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description
            </Label>

            <Textarea
              id="description"
              placeholder="Describe the garbage or problem..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-3">
  <div>
    <Label>Location</Label>

    <p className="mt-1 text-sm text-muted-foreground">
      Use your current location or click anywhere on the map to select
      exactly where the garbage is located.
    </p>
  </div>

  <Button
    type="button"
    variant="outline"
    onClick={getCurrentLocation}
    className="w-full"
  >
    <MapPin className="mr-2 h-4 w-4" />
    Use my current location
  </Button>

  <ReportLocationMap
  latitude={latitude}
  longitude={longitude}
  onLocationSelect={(lat, lng, selectedAddress, selectedPlaceId) => {
  setLatitude(lat);
  setLongitude(lng);
  setLocation(selectedAddress);
  setAddress(selectedAddress);
  setPlaceId(selectedPlaceId ?? "");
}}
/>

{location && (
  <div className="rounded-lg bg-muted p-3 text-sm">
    <p className="font-medium">📍 Selected location</p>
    <p className="mt-1 text-muted-foreground">
      {location}
    </p>
  </div>
)}


</div>

          <Button type="submit" className="w-full">
            Submit Garbage Report
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}