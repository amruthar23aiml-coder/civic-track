import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  MapPin,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {SiteLayout} from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {ReportLocationMap} from "@/components/ReportLocationMap";

export const Route = createFileRoute("/_authenticated/report")({
  component: ReportGarbage,
});

type ReportCategory =
  | "streetlight"
  | "pothole"
  | "garbage"
  | "drainage"
  | "traffic"
  | "infrastructure"
  | "illegal_dumping"
  | "other"
  | "";

const categories: {
  value: ReportCategory;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    value: "streetlight",
    icon: "💡",
    title: "Broken Streetlight",
    description: "Streetlight that is damaged, flickering, or not working",
  },
  {
    value: "pothole",
    icon: "🕳️",
    title: "Pothole / Damaged Road",
    description: "Potholes, broken roads, or unsafe road surfaces",
  },
  {
    value: "garbage",
    icon: "🗑️",
    title: "Garbage / Litter",
    description: "Waste left on streets or in public spaces",
  },
  {
    value: "drainage",
    icon: "🚰",
    title: "Water / Drainage Issue",
    description: "Blocked drains, flooding, leaks, or water problems",
  },
  {
    value: "traffic",
    icon: "🚦",
    title: "Traffic / Road Safety",
    description: "Issues affecting traffic flow or public road safety",
  },
  {
    value: "infrastructure",
    icon: "🏗️",
    title: "Public Infrastructure",
    description: "Damaged or poorly maintained public facilities",
  },
  {
    value: "illegal_dumping",
    icon: "🚯",
    title: "Illegal Dumping",
    description: "Waste dumped in an unauthorised location",
  },
  {
    value: "other",
    icon: "✏️",
    title: "Other Issue",
    description: "Something else that needs attention",
  },
];

function ReportGarbage() {
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("");
  const [otherCategory, setOtherCategory] = useState("");

  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState("");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handlePhotoChange(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please choose an image smaller than 5 MB.");
      return;
    }

    setPhoto(file);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  }

  function removePhoto() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(null);
    setPhotoPreview(null);
  }

  function handleLocationSelect(
    selectedLatitude: number,
    selectedLongitude: number,
    selectedAddress: string,
    selectedPlaceId?: string,
  ) {
    setLatitude(selectedLatitude);
    setLongitude(selectedLongitude);
    setAddress(selectedAddress);
    setLocation(selectedAddress);
    setPlaceId(selectedPlaceId ?? "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!photo) {
      toast.error("Please add a photo of the issue.");
      return;
    }

    if (!category) {
      toast.error("Please select an issue type.");
      return;
    }

    if (category === "other" && !otherCategory.trim()) {
      toast.error("Please tell us what type of issue you are reporting.");
      return;
    }

    if (latitude === null || longitude === null) {
      toast.error("Please select the issue location on the map.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Please sign in before submitting a report.");
        navigate({
          to: "/auth",
          search: {
            role: "citizen",
            returnTo: "/report",
          },
        });
        return;
      }

      const fileExtension =
        photo.name.split(".").pop()?.toLowerCase() || "jpg";

      const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(fileName, photo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        toast.error("Could not upload the photo. Please try again.");
        return;
      }

      const mapsLink =
        placeId
          ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(
              placeId,
            )}`
          : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

      const finalDescription =
        category === "other" && otherCategory.trim()
          ? `${otherCategory.trim()}${description.trim() ? `\n\n${description.trim()}` : ""}`
          : description.trim();

      const { error: insertError } = await supabase.from("reports").insert({
        user_id: user.id,
        title: "Community Issue Report",
        description: finalDescription,
        category,
        location_name: location || "Selected location",
        address: address || null,
        latitude,
        longitude,
        before_image_url: fileName,
        maps_link: mapsLink,
      });

      if (insertError) {
        console.error(insertError);
        toast.error("Could not submit your report. Please try again.");
        return;
      }

      toast.success("Your issue has been reported successfully.");

     setIsSubmitted(true);

    
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while submitting your report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SiteLayout>
  <div className="min-h-screen bg-background">
    {isSubmitted ? (
      <div className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-3xl border border-primary/20 bg-card/70 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>

          <h1 className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl">
            Your report has been submitted!
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Thank you for helping improve your community. Your issue has been
            recorded and can now be tracked through CivicTrack.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Button
              type="button"
              className="h-12 rounded-xl"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              View My Reports
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl"
              onClick={() => {
                setIsSubmitted(false);
                setDescription("");
                setCategory("");
                setOtherCategory("");
                setLocation("");
                setAddress("");
                setLatitude(null);
                setLongitude(null);
                setPlaceId("");
                removePhoto();
              }}
            >
              Report Another Issue
            </Button>
          </div>

          <div className="mt-8 rounded-2xl bg-primary/5 p-4 text-sm text-muted-foreground">
            You can follow the progress of your report from{" "}
            <span className="font-medium text-primary">My Reports</span>.
          </div>
        </div>
      </div>
    ) : (
      <>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to CivicTrack
            </button>

            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <MapPin className="h-3.5 w-3.5" />
                Community Action
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Spot an issue?
                <span className="block text-primary">
                  Help us fix it.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Report a problem in your community and help local teams
                understand where action is needed.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    1
                  </span>
                  Report
                </div>

                <span className="text-muted-foreground/40">→</span>

                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    2
                  </span>
                  Review
                </div>

                <span className="text-muted-foreground/40">→</span>

                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    3
                  </span>
                  Resolve
                </div>
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            {/* LEFT SIDE */}
            <div className="space-y-8">
              {/* Issue details */}
              <section className="rounded-3xl border border-white/10 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold">
                      Tell us what you noticed
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A few details will help the right team understand the
                      problem.
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block text-sm font-medium">
                    What type of issue is this?
                  </Label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {categories.map((item) => {
                      const selected = category === item.value;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setCategory(item.value)}
                          className={`group rounded-2xl border p-4 text-left transition-all duration-200 ${
                            selected
                              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-white/10 bg-background/30 hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${
                                selected
                                  ? "bg-primary/15"
                                  : "bg-muted/50 group-hover:bg-primary/10"
                              }`}
                            >
                              {item.icon}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                  {item.title}
                                </span>

                                {selected && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                                )}
                              </div>

                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {category === "other" && (
                  <div className="mt-5">
                    <Label htmlFor="other-category">
                      What kind of issue is it?
                    </Label>

                    <Input
                      id="other-category"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      placeholder="e.g. damaged public property"
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="mt-6">
                  <Label htmlFor="description">
                    Describe what is happening
                  </Label>

                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us what you saw, how long it has been there, or anything else that might help..."
                    className="mt-2 min-h-[140px] resize-none"
                  />

                  <p className="mt-2 text-xs text-muted-foreground">
                    A short, clear description can help the issue get
                    understood faster.
                  </p>
                </div>
              </section>

              {/* Photo */}
              <section className="rounded-3xl border border-white/10 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold">
                      Show us what’s happening
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add a photo so the issue can be understood more clearly.
                    </p>
                  </div>
                </div>

                {!photoPreview ? (
                  <label
                    htmlFor="issue-photo"
                    className="group flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-background/30 px-6 text-center transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                      <ImagePlus className="h-7 w-7" />
                    </div>

                    <p className="font-medium">
                      Add a photo of the issue
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Click to choose an image from your device
                    </p>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                      <Upload className="h-3.5 w-3.5" />
                      Choose image
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      JPG, PNG or other image formats · Max 10 MB
                    </p>

                    <input
                      id="issue-photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-background/30">
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Issue preview"
                        className="max-h-[420px] w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {photo?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Photo ready to submit
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removePhoto}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-8">
              {/* Location */}
              <section className="overflow-hidden rounded-3xl border border-white/10 bg-card/70 shadow-xl backdrop-blur-xl">
                <div className="p-5 pb-4 sm:p-7 sm:pb-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold">
                        Where is the issue?
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Search for the location or place a pin exactly where
                        the issue is.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10">
                  <ReportLocationMap
                    latitude={latitude}
                    longitude={longitude}
                    onLocationSelect={(
                        selectedLatitude: number,
                        selectedLongitude: number,
                        selectedAddress: string,
                        selectedPlaceId?: string,
                      ) => {
                        handleLocationSelect(
                        selectedLatitude,
                        selectedLongitude,
                        selectedAddress,
                        selectedPlaceId,
                      );
                    }}
                  />
                </div>
              </section>

              {/* Submit */}
              <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/70 to-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Send className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold">
                      Ready to make a difference?
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Submit your report and help your community take action.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Your report will be saved securely
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    The selected location will be included
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    You can track the report from your dashboard
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-7 h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/10"
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending Report...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Report This Issue
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                  By submitting, you’re helping CivicTrack turn community
                  observations into action.
                </p>
              </section>
            </div>
          </div>
                        </form>
      </>
    )}
  </div>
</SiteLayout>
  );
}