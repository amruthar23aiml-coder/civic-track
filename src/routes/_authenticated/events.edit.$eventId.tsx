import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ImagePlus, Loader2, MapPin, Phone, Users, X } from "lucide-react";
import { toast } from "sonner";

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
import { eventQuery } from "@/lib/data";
import {
  CATEGORY_GROUPS,
  CATEGORY_MAP,
  categoriesByGroup,
  type EventCategory,
} from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/events/edit/$eventId")({
  head: () => ({
    meta: [{ title: "Edit Event — CivicTrack" }],
  }),
  component: EditEvent,
});

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function EditEvent() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const eventQueryResult = useQuery(eventQuery(eventId));
  const event = eventQueryResult.data;
  const canManage = !!user && !!event && (event.organizer_id === user.id || isAdmin);

  const [category, setCategory] = useState<EventCategory>("community_cleanup");
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
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!event || initialized) return;
    setCategory(event.category);
    setCategoryOther(event.category_other ?? "");
    setDetails(
      Object.fromEntries(
        Object.entries(event.details ?? {}).map(([key, value]) => [key, String(value ?? "")]),
      ),
    );
    setForm({
      title: event.title,
      description: event.description,
      location_name: event.location_name,
      address: event.address ?? "",
      landmark: event.landmark ?? "",
      contact_name: event.contact_name ?? "",
      contact_phone: event.contact_phone ?? "",
      starts_at: toDateTimeLocal(event.starts_at),
      ends_at: toDateTimeLocal(event.ends_at),
      capacity: String(event.capacity),
    });
    setCoords(
      event.latitude !== null && event.longitude !== null
        ? { latitude: event.latitude, longitude: event.longitude }
        : null,
    );
    setImagePreview(event.cover_url);
    setInitialized(true);
  }, [event, initialized]);

  const def = useMemo(() => CATEGORY_MAP[category], [category]);
  const set =
    (key: keyof typeof form) =>
    (inputEvent: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: inputEvent.target.value }));

  const update = useMutation({
    mutationFn: async () => {
      if (!user?.id || !event || !canManage) {
        throw new Error("You are not authorized to edit this event.");
      }
      if (!form.title.trim() || !form.description.trim() || !form.location_name.trim()) {
        throw new Error("Title, description, and venue are required.");
      }
      if (!form.starts_at) {
        throw new Error("Please select a start date and time.");
      }

      let coverUrl = event.cover_url;
      if (coverImage) {
        const extension = coverImage.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `events/${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(filePath, coverImage, {
            cacheControl: "3600",
            upsert: false,
            contentType: coverImage.type || "image/jpeg",
          });
        if (uploadError) throw new Error(`Could not upload event image: ${uploadError.message}`);
        coverUrl = supabase.storage.from("report-photos").getPublicUrl(filePath).data.publicUrl;
      }

      const cleanDetails = Object.fromEntries(
        Object.entries(details)
          .filter(([, value]) => value.trim() !== "")
          .map(([key, value]) => [key, value.trim().slice(0, 600)]),
      );

      const { error } = await supabase
        .from("events")
        .update({
          category,
          category_other: category === "other" ? categoryOther.trim().slice(0, 80) || null : null,
          details: cleanDetails,
          title: form.title.trim().slice(0, 120),
          description: form.description.trim().slice(0, 2000),
          location_name: form.location_name.trim().slice(0, 160),
          address: form.address.trim().slice(0, 240) || null,
          landmark: form.landmark.trim().slice(0, 160) || null,
          contact_name: form.contact_name.trim().slice(0, 120) || null,
          contact_phone: form.contact_phone.trim().slice(0, 40) || null,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          capacity: Math.max(1, Math.min(1000, Number(form.capacity || 20))),
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          cover_url: coverUrl,
        })
        .eq("id", eventId)
        .eq("organizer_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event updated successfully.");
      navigate({ to: "/events/$eventId", params: { eventId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (authLoading || eventQueryResult.isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!eventQueryResult.data || (!canManage && !authLoading)) {
    return <Navigate to="/events" />;
  }

  return (
    <SiteLayout>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <CalendarDays className="size-3.5" /> Community event
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Edit event</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Update the details participants will see for this event.
            </p>
          </div>

          <form
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              update.mutate();
            }}
            className="grid gap-6 lg:grid-cols-[1fr_360px]"
          >
            <div className="space-y-6">
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold">Event information</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell people what this event is about.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Event category</Label>
                    <Select
                      value={category}
                      onValueChange={(value) => setCategory(value as EventCategory)}
                    >
                      <SelectTrigger className="h-11 border-input bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {CATEGORY_GROUPS.map((group) => (
                          <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {categoriesByGroup(group).map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                <span className="flex items-center gap-2">
                                  <item.icon className="size-4" />
                                  {item.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <CategoryChip category={category} custom={categoryOther} />
                  </div>
                  {category === "other" && (
                    <div className="space-y-2">
                      <Label htmlFor="category_other">Event type</Label>
                      <Input
                        id="category_other"
                        maxLength={80}
                        value={categoryOther}
                        onChange={(e) => setCategoryOther(e.target.value)}
                        className="h-11 border-input bg-background/50"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="title">Event title</Label>
                    <Input
                      id="title"
                      required
                      maxLength={120}
                      value={form.title}
                      onChange={set("title")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={5}
                      required
                      maxLength={2000}
                      value={form.description}
                      onChange={set("description")}
                      className="resize-none border-input bg-background/50"
                    />
                  </div>
                  {def.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={field.key}
                          value={details[field.key] ?? ""}
                          onChange={(e) =>
                            setDetails((current) => ({ ...current, [field.key]: e.target.value }))
                          }
                          className="resize-none border-input bg-background/50"
                        />
                      ) : field.type === "select" ? (
                        <Select
                          value={details[field.key] ?? ""}
                          onValueChange={(value) =>
                            setDetails((current) => ({ ...current, [field.key]: value }))
                          }
                        >
                          <SelectTrigger className="h-11 border-input bg-background/50">
                            <SelectValue placeholder={field.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type === "number" ? "number" : field.type}
                          value={details[field.key] ?? ""}
                          onChange={(e) =>
                            setDetails((current) => ({ ...current, [field.key]: e.target.value }))
                          }
                          className="h-11 border-input bg-background/50"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">Event cover image</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Replace the image if needed.</p>
                </div>
                {!imagePreview ? (
                  <label
                    htmlFor="cover-image"
                    className="group flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 px-6 text-center transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <ImagePlus className="mb-4 size-7 text-primary" />
                    <p className="font-medium">Upload event image</p>
                    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WEBP · up to 5 MB</p>
                    <input
                      id="cover-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size <= 5 * 1024 * 1024) {
                          setCoverImage(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
                    <img
                      src={imagePreview}
                      alt="Event cover preview"
                      className="h-[280px] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-destructive/85 px-3 py-2 text-xs font-medium text-destructive-foreground backdrop-blur transition hover:bg-destructive"
                    >
                      <X className="size-4" /> Remove
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="size-5 text-primary" /> Event location
                </h2>
                <div className="mt-5 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="location_name">Venue name</Label>
                    <Input
                      id="location_name"
                      required
                      value={form.location_name}
                      onChange={set("location_name")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={set("address")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landmark">Landmark</Label>
                    <Input
                      id="landmark"
                      value={form.landmark}
                      onChange={set("landmark")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <ReportLocationMap
                    latitude={coords?.latitude ?? null}
                    longitude={coords?.longitude ?? null}
                    onLocationSelect={(latitude, longitude, address) => {
                      setCoords({ latitude, longitude });
                      setForm((current) => ({ ...current, address }));
                    }}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarDays className="size-5 text-primary" /> Schedule and capacity
                </h2>
                <div className="mt-5 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">Starts</Label>
                    <Input
                      id="starts_at"
                      required
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={set("starts_at")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ends_at">Ends</Label>
                    <Input
                      id="ends_at"
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={set("ends_at")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Volunteer capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="1000"
                      value={form.capacity}
                      onChange={set("capacity")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Phone className="size-5 text-primary" /> Contact information
                </h2>
                <div className="mt-5 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact name</Label>
                    <Input
                      id="contact_name"
                      value={form.contact_name}
                      onChange={set("contact_name")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact phone</Label>
                    <Input
                      id="contact_phone"
                      value={form.contact_phone}
                      onChange={set("contact_phone")}
                      className="h-11 border-input bg-background/50"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xl backdrop-blur-xl sm:p-7">
                <Button
                  type="submit"
                  disabled={update.isPending}
                  className="h-12 w-full text-base font-semibold"
                >
                  {update.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Saving changes...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
                <Button asChild type="button" variant="outline" className="mt-3 w-full">
                  <Link to="/events/$eventId" params={{ eventId }}>
                    Cancel
                  </Link>
                </Button>
              </section>
            </div>
          </form>
        </div>
      </main>
    </SiteLayout>
  );
}
