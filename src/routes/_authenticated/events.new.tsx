import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SiteLayout } from "@/components/SiteLayout";
import { CategoryChip } from "@/components/CategoryChip";
import { ReportLocationMap } from "@/components/ReportLocationMap";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocode.functions";
import {
  CATEGORY_GROUPS,
  CATEGORY_MAP,
  categoriesByGroup,
  type EventCategory,
} from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({
    meta: [
      { title: "Create an Event — CivicTrack" },
      {
        name: "description",
        content:
          "Create a community event and invite people to participate.",
      },
    ],
  }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] =
    useState<EventCategory>("community_cleanup");

  const [categoryOther, setCategoryOther] = useState("");

  const [details, setDetails] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    location_name: "",
    address: "",
    landmark: "",
    contact_name: "",
    contact_phone: "",
    starts_at: "",
    ends_at: "",
    capacity: "20",
  });

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const set =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setForm((current) => ({
        ...current,
        [key]: e.target.value,
      }));
    };

  const def = CATEGORY_MAP[category];

  /*
   * Create / clean image preview.
   */
  useEffect(() => {
    if (!coverImage) {
      setImagePreview(null);
      return;
    }

    const url = URL.createObjectURL(coverImage);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [coverImage]);

  /*
   * Reset category-specific details when category changes.
   * This prevents fields from an old category appearing
   * when the user switches to another event type.
   */
  useEffect(() => {
    setDetails({});
  }, [category]);

  /*
   * Address verification.
   */
  const locate = useMutation({
    mutationFn: async () =>
      geocodeAddress({
        data: {
          query: form.address || form.location_name,
        },
      }),

    onSuccess: (result) => {
      if (!result) {
        toast.error("No location match found.");
        return;
      }

      setCoords({
        latitude: result.latitude,
        longitude: result.longitude,
      });

      setForm((current) => ({
        ...current,
        address: result.address,
      }));

      toast.success("Location confirmed.");
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /*
   * Upload image + create event.
   */
  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("You must be signed in to create an event.");
      }

      if (!form.title.trim()) {
        throw new Error("Please enter an event title.");
      }

      if (!form.description.trim()) {
        throw new Error("Please enter an event description.");
      }

      if (!form.location_name.trim()) {
        throw new Error("Please enter the venue name.");
      }

      if (!form.starts_at) {
        throw new Error("Please select a start date and time.");
      }

      /*
       * Upload cover image if selected.
       */
      let coverUrl: string | null = null;

      if (coverImage) {
        const extension =
          coverImage.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `events/${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(filePath, coverImage, {
            cacheControl: "3600",
            upsert: false,
            contentType: coverImage.type || "image/jpeg",
          });

        if (uploadError) {
          throw new Error(
            `Could not upload event image: ${uploadError.message}`,
          );
        }

        const { data: publicData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(filePath);

        coverUrl = publicData.publicUrl;
      }

      const cleanDetails = Object.fromEntries(
        Object.entries(details)
          .filter(([, value]) => value.trim() !== "")
          .map(([key, value]) => [
            key,
            value.trim().slice(0, 600),
          ]),
      );

      const { data, error } = await supabase
        .from("events")
        .insert({
          organizer_id: user.id,

          category,

          category_other:
            category === "other"
              ? categoryOther.trim().slice(0, 80) || null
              : null,

          details: cleanDetails,

          title: form.title.trim().slice(0, 120),

          description: form.description.trim().slice(0, 2000),

          location_name: form.location_name
            .trim()
            .slice(0, 160),

          address: form.address.trim()
            ? form.address.trim().slice(0, 240)
            : null,

          landmark: form.landmark.trim()
            ? form.landmark.trim().slice(0, 160)
            : null,

          contact_name: form.contact_name.trim()
            ? form.contact_name.trim().slice(0, 120)
            : null,

          contact_phone: form.contact_phone.trim()
            ? form.contact_phone.trim().slice(0, 40)
            : null,

          starts_at: new Date(form.starts_at).toISOString(),

          ends_at: form.ends_at
            ? new Date(form.ends_at).toISOString()
            : null,

          capacity: Math.max(
            1,
            Math.min(
              1000,
              Number(form.capacity || 20),
            ),
          ),

          latitude: coords?.latitude ?? null,

          longitude: coords?.longitude ?? null,

          cover_url: coverUrl,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    onSuccess: (data) => {
      toast.success("Event published successfully!");

      navigate({
        to: "/events/$eventId",
        params: {
          eventId: data.id,
        },
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeImage = () => {
    setCoverImage(null);
    setImagePreview(null);
  };

  return (
    <SiteLayout>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {/* Header */}
          <div className="mb-8 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <CalendarDays className="size-3.5" />
              Community event
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Create an event
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Bring people together around an initiative that makes
              your community better.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
            className="grid gap-6 lg:grid-cols-[1fr_360px]"
          >
            {/* LEFT */}
            <div className="space-y-6">
              {/* Basic information */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">
                    Event information
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell people what this event is about.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Event category</Label>

                    <Select
                      value={category}
                      onValueChange={(value) =>
                        setCategory(value as EventCategory)
                      }
                    >
                      <SelectTrigger className="h-11 border-input bg-background/50">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent className="max-h-80">
                        {CATEGORY_GROUPS.map((group) => (
                          <SelectGroup key={group}>
                            <SelectLabel>
                              {group}
                            </SelectLabel>

                            {categoriesByGroup(group).map(
                              (item) => (
                                <SelectItem
                                  key={item.value}
                                  value={item.value}
                                >
                                  <span className="flex items-center gap-2">
                                    <item.icon className="size-4" />
                                    {item.label}
                                  </span>
                                </SelectItem>
                              ),
                            )}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>

                    <CategoryChip
                      category={category}
                      custom={categoryOther}
                    />
                  </div>

                  {/* Other category */}
                  {category === "other" && (
                    <div className="space-y-2">
                      <Label htmlFor="category_other">
                        Event type
                      </Label>

                      <Input
                        id="category_other"
                        required
                        maxLength={80}
                        placeholder="e.g. Community library setup"
                        value={categoryOther}
                        onChange={(event) =>
                          setCategoryOther(event.target.value)
                        }
                        className="h-11 border-input bg-background/50"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Event title
                    </Label>

                    <Input
                      id="title"
                      required
                      maxLength={120}
                      placeholder="Give your event a clear name"
                      value={form.title}
                      onChange={set("title")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description
                    </Label>

                    <Textarea
                      id="description"
                      rows={5}
                      required
                      maxLength={2000}
                      placeholder="Explain what participants will do and what they should know."
                      value={form.description}
                      onChange={set("description")}
                      className="resize-none border-input bg-background/50"
                    />
                  </div>
                </div>
              </section>

              {/* Cover image */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">
                    Event cover image
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a photo that represents your event.
                  </p>
                </div>

                {!imagePreview ? (
                  <label
                    htmlFor="cover-image"
                    className="group flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-6 text-center transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                      <ImagePlus className="size-7" />
                    </div>

                    <p className="font-medium">
                      Upload event image
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG or WEBP · up to 5 MB
                    </p>

                    <input
                      id="cover-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (!file) return;

                        if (file.size > 5 * 1024 * 1024) {
                          toast.error(
                            "Image must be smaller than 5 MB.",
                          );
                          return;
                        }

                        setCoverImage(file);
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
                    <img
                      src={imagePreview}
                      alt="Event cover preview"
                      className="h-[280px] w-full object-cover sm:h-[340px]"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                      <span className="text-sm font-medium">
                        Cover preview
                      </span>

                      <button
                        type="button"
                        onClick={removeImage}
                        className="inline-flex items-center gap-2 rounded-lg bg-destructive/85 px-3 py-2 text-xs font-medium text-destructive-foreground backdrop-blur transition hover:bg-destructive"
                      >
                        <X className="size-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Category-specific details */}
              {def.fields.length > 0 && (
                <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold">
                      {def.label} details
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Only information relevant to this event type
                      is shown here.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    {def.fields.map((field) => (
                      <div
                        key={field.key}
                        className={
                          field.type === "textarea"
                            ? "space-y-2 sm:col-span-2"
                            : "space-y-2"
                        }
                      >
                        <Label htmlFor={`d-${field.key}`}>
                          {field.label}
                        </Label>

                        {field.type === "textarea" ? (
                          <Textarea
                            id={`d-${field.key}`}
                            rows={3}
                            maxLength={600}
                            placeholder={field.placeholder}
                            value={
                              details[field.key] ?? ""
                            }
                            onChange={(event) =>
                              setDetails((current) => ({
                                ...current,
                                [field.key]:
                                  event.target.value,
                              }))
                            }
                            className="resize-none border-input bg-background/50"
                          />
                        ) : field.type === "select" ? (
                          <Select
                            value={
                              details[field.key] ?? ""
                            }
                            onValueChange={(value) =>
                              setDetails((current) => ({
                                ...current,
                                [field.key]: value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 border-input bg-background/50">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>

                            <SelectContent>
                              {(field.options ?? []).map(
                                (option) => (
                                  <SelectItem
                                    key={option}
                                    value={option}
                                  >
                                    {option}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={`d-${field.key}`}
                            type={
                              field.type === "number"
                                ? "number"
                                : field.type === "date"
                                  ? "date"
                                  : "text"
                            }
                            min={
                              field.type === "number"
                                ? "0"
                                : undefined
                            }
                            maxLength={
                              field.type === "text"
                                ? 200
                                : undefined
                            }
                            placeholder={
                              field.placeholder
                            }
                            value={
                              details[field.key] ?? ""
                            }
                            onChange={(event) =>
                              setDetails((current) => ({
                                ...current,
                                [field.key]:
                                  event.target.value,
                              }))
                            }
                            className="h-11 border-input bg-background/50"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Location */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <MapPin className="size-5 text-primary" />
                    Event location
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Help participants find the event easily.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="location_name">
                      Venue name
                    </Label>

                    <Input
                      id="location_name"
                      required
                      maxLength={160}
                      placeholder="Riverside Park, Community Hall..."
                      value={form.location_name}
                      onChange={set("location_name")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">
                      Address
                    </Label>

                    <div className="flex gap-2">
                      <Input
                        id="address"
                        maxLength={240}
                        placeholder="Enter the full address"
                        value={form.address}
                        onChange={set("address")}
                        className="h-11 border-input bg-background/50"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          locate.mutate()
                        }
                        disabled={locate.isPending}
                        className="shrink-0"
                      >
                        {locate.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MapPin className="size-4" />
                        )}

                        <span className="hidden sm:inline">
                          Verify
                        </span>
                      </Button>
                    </div>
                  </div>

                  <ReportLocationMap
                    latitude={coords?.latitude ?? null}
                    longitude={coords?.longitude ?? null}
                    onLocationSelect={(
                      latitude,
                      longitude,
                      selectedAddress,
                    ) => {
                      setCoords({
                        latitude,
                        longitude,
                      });

                      setForm((current) => ({
                        ...current,
                        address: selectedAddress,
                      }));
                    }}
                  />
                </div>
              </section>
            </div>

            {/* RIGHT SIDEBAR */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Date */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl">
                <h2 className="mb-5 flex items-center gap-2 font-semibold">
                  <CalendarDays className="size-5 text-primary" />
                  Schedule
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">
                      Starts
                    </Label>

                    <Input
                      id="starts_at"
                      type="datetime-local"
                      required
                      value={form.starts_at}
                      onChange={set("starts_at")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ends_at">
                      Ends
                    </Label>

                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={set("ends_at")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                </div>
              </section>

              {/* Capacity */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl">
                <h2 className="mb-5 flex items-center gap-2 font-semibold">
                  <Users className="size-5 text-primary" />
                  Participation
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="capacity">
                    Volunteer capacity
                  </Label>

                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="1000"
                    value={form.capacity}
                    onChange={set("capacity")}
                    className="h-11 border-input bg-background/50"
                  />

                  <p className="text-xs text-muted-foreground">
                    Maximum number of people who can register.
                  </p>
                </div>
              </section>

              {/* Contact */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl">
                <h2 className="mb-5 flex items-center gap-2 font-semibold">
                  <Phone className="size-5 text-primary" />
                  Contact
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="landmark">
                      Landmark
                    </Label>

                    <Input
                      id="landmark"
                      maxLength={160}
                      placeholder="Near the main gate..."
                      value={form.landmark}
                      onChange={set("landmark")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">
                      Contact person
                    </Label>

                    <Input
                      id="contact_name"
                      maxLength={120}
                      placeholder="Contact name"
                      value={form.contact_name}
                      onChange={set("contact_name")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">
                      Contact number
                    </Label>

                    <Input
                      id="contact_phone"
                      maxLength={40}
                      placeholder="Phone number"
                      value={form.contact_phone}
                      onChange={set("contact_phone")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                </div>
              </section>

              {/* Publish */}
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  Your event will be visible to the CivicTrack
                  community after publishing.
                </p>

                <Button
                  type="submit"
                  disabled={create.isPending}
                  className="mt-4 h-12 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground"
                >
                  {create.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish event"
                  )}
                </Button>
              </section>
            </aside>
          </form>
        </div>
      </main>
    </SiteLayout>
  );
}