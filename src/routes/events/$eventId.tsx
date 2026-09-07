import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Camera, Loader2, MapPin, Navigation, Phone, Recycle, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteLayout } from "@/components/SiteLayout";
import { CategoryChip } from "@/components/CategoryChip";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { UpcomingEventsBanner, DonationBanner } from "@/components/SideBanners";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteEvent,
  deletePhoto,
  eventQuery,
  photosQuery,
  profilesQuery,
  signPhotoUrls,
  wasteLogsQuery,
} from "@/lib/data";
import { CATEGORY_MAP } from "@/lib/categories";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Clean-up event details — CleanSweep" },
      { name: "description", content: "Event details, volunteer roster, waste logged, and before/after photos." },
      { property: "og:title", content: "Clean-up event details — CleanSweep" },
      { property: "og:description", content: "See the roster, the waste collected, and the before/after photos." },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: event, isLoading } = useQuery(eventQuery(eventId));
  const logs = useQuery(wasteLogsQuery(eventId));
  const photos = useQuery(photosQuery(eventId));

  const volunteerIds = (event?.registrations ?? []).map((r) => r.volunteer_id);
  const profiles = useQuery(profilesQuery(volunteerIds));
  const signed = useQuery({
    queryKey: ["signed", eventId, (photos.data ?? []).map((p) => p.id).join(",")],
    enabled: (photos.data?.length ?? 0) > 0,
    queryFn: () => signPhotoUrls((photos.data ?? []).map((p) => p.url)),
  });

  const myReg = event?.registrations?.find((r) => r.volunteer_id === user?.id);
  const canManage = !!user && !!event && (event.organizer_id === user.id || isAdmin);
  const signups = event?.registrations?.length ?? 0;
  const full = !!event && signups >= event.capacity;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["event", eventId] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    qc.invalidateQueries({ queryKey: ["platform-stats"] });
  };

  const register = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("registrations").insert({ event_id: eventId, volunteer_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're signed up!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("registrations").delete().eq("id", myReg!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAttendance = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: "pending" | "attended" | "absent" }) => {
      const { error } = await supabase.from("registrations").update({ attendance: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [weight, setWeight] = useState("");
  const [bags, setBags] = useState("");
  const [notes, setNotes] = useState("");
  const addLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("waste_logs").insert({
        event_id: eventId,
        user_id: user!.id,
        weight_kg: Number(weight || 0),
        bags: Number(bags || 0),
        notes: notes.trim() ? notes.trim().slice(0, 500) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Waste logged. Thank you!");
      setWeight("");
      setBags("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["waste-logs", eventId] });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [uploading, setUploading] = useState(false);
  const removePhoto = useMutation({
    mutationFn: (photo: { id: string; url: string }) => deletePhoto(photo),
    onSuccess: () => {
      toast.success("Photo deleted.");
      qc.invalidateQueries({ queryKey: ["photos", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEvent = useMutation({
    mutationFn: () => deleteEvent(eventId),
    onSuccess: () => {
      toast.success("Event deleted.");
      qc.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/events" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function upload(kind: "before" | "after", file: File) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${eventId}/${kind}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("event-photos").upload(path, file);
    if (!error) {
      const { error: dbError } = await supabase
        .from("event_photos")
        .insert({ event_id: eventId, user_id: user.id, kind, url: path });
      if (dbError) toast.error(dbError.message);
      else {
        toast.success(`${kind === "before" ? "Before" : "After"} photo uploaded.`);
        qc.invalidateQueries({ queryKey: ["photos", eventId] });
      }
    } else {
      toast.error(error.message);
    }
    setUploading(false);
  }

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!event) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Button asChild className="mt-6">
            <Link to="/events">Back to events</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const totalWeight = (logs.data ?? []).reduce((s, l) => s + Number(l.weight_kg), 0);
  const totalBags = (logs.data ?? []).reduce((s, l) => s + l.bags, 0);

  return (
    <SiteLayout>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="capitalize">{event.status}</Badge>
              <CategoryChip category={event.category} custom={event.category_other} />
            </div>
            <h1 className="mt-3 text-3xl font-bold">{event.title}</h1>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                {format(new Date(event.starts_at), "EEEE d MMMM yyyy · HH:mm")}
                {event.ends_at ? ` – ${format(new Date(event.ends_at), "HH:mm")}` : ""}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                {event.location_name}
                {event.address ? ` — ${event.address}` : ""}
              </p>
              <p className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                {signups} of {event.capacity} volunteer spots filled
              </p>
            </div>
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed">{event.description}</p>
            {CATEGORY_MAP[event.category]?.fields.some(
              (f) => (event.details as Record<string, string>)?.[f.key],
            ) && (
              <dl className="surface-card mt-6 grid gap-4 p-5 sm:grid-cols-2">
                {CATEGORY_MAP[event.category].fields
                  .filter((f) => (event.details as Record<string, string>)[f.key])
                  .map((f) => (
                    <div key={f.key}>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-line text-sm">
                        {(event.details as Record<string, string>)[f.key]}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Recycle className="size-5 text-primary" /> Waste collected
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalWeight.toFixed(1)} kg across {totalBags} bags · {logs.data?.length ?? 0} log
              {(logs.data?.length ?? 0) === 1 ? "" : "s"}
            </p>

            {user && (
              <form
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  addLog.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bags">Bags</Label>
                  <Input id="bags" type="number" min="0" value={bags} onChange={(e) => setBags(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={addLog.isPending || (!weight && !bags)}>
                    Log
                  </Button>
                </div>
                <Textarea
                  placeholder="Notes (optional)"
                  className="sm:col-span-3"
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </form>
            )}

            <ul className="mt-5 divide-y divide-border text-sm">
              {(logs.data ?? []).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-4 py-2">
                  <div>
                    <p className="font-medium">{profiles.data?.[l.user_id]?.full_name ?? "Volunteer"}</p>
                    {l.notes && <p className="text-muted-foreground">{l.notes}</p>}
                  </div>
                  <p className="shrink-0 text-muted-foreground">
                    {Number(l.weight_kg).toFixed(1)} kg · {l.bags} bags
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Camera className="size-5 text-primary" /> Before &amp; after
            </h2>
            {user && (
              <div className="mt-4 flex flex-wrap gap-4">
                {(["before", "after"] as const).map((kind) => (
                  <div key={kind} className="space-y-1.5">
                    <Label htmlFor={`file-${kind}`} className="capitalize">
                      {kind} photo
                    </Label>
                    <Input
                      id={`file-${kind}`}
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(kind, file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(["before", "after"] as const).map((kind) => (
                <div key={kind}>
                  <p className="mb-2 text-sm font-medium capitalize text-muted-foreground">{kind}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(photos.data ?? [])
                      .filter((p) => p.kind === kind)
                      .map((p) => (
                        <div key={p.id} className="group relative">
                          <img
                            src={signed.data?.[p.url] ?? ""}
                            alt={`${kind} photo from ${event.title}`}
                            loading="lazy"
                            className="aspect-square w-full rounded-lg border border-border object-cover"
                          />
                          {(isAdmin || p.user_id === user?.id) && (
                            <ConfirmDelete
                              title="Delete this photo?"
                              description="The file will be removed from storage."
                              confirmLabel="Delete photo"
                              disabled={removePhoto.isPending}
                              onConfirm={() => removePhoto.mutate({ id: p.id, url: p.url })}
                              preview={
                                <img
                                  src={signed.data?.[p.url] ?? ""}
                                  alt="Photo to be deleted"
                                  className="max-h-56 w-full rounded-lg object-contain"
                                />
                              }
                              trigger={
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute right-1.5 top-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              }
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="surface-card p-5">
            <Progress value={Math.min(100, Math.round((signups / Math.max(1, event.capacity)) * 100))} className="h-2" />
            <p className="mt-3 text-sm text-muted-foreground">
              {Math.max(0, event.capacity - signups)} spots remaining
            </p>
            {!user ? (
              <Button asChild className="mt-4 w-full">
                <Link to="/auth">Sign in to volunteer</Link>
              </Button>
            ) : myReg ? (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                Cancel my registration
              </Button>
            ) : (
              <Button
                className="mt-4 w-full"
                onClick={() => register.mutate()}
                disabled={register.isPending || full || event.status !== "upcoming"}
              >
                {full ? "Event full" : "Sign up to volunteer"}
              </Button>
            )}
          </div>

          <div className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="size-5 text-primary" /> Location information
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Venue</dt>
                <dd className="font-medium">{event.location_name}</dd>
              </div>
              {event.address && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Address</dt>
                  <dd>{event.address}</dd>
                </div>
              )}
              {event.landmark && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Landmark</dt>
                  <dd>{event.landmark}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date &amp; time</dt>
                <dd>
                  {format(new Date(event.starts_at), "EEE d MMM yyyy · HH:mm")}
                  {event.ends_at ? ` – ${format(new Date(event.ends_at), "HH:mm")}` : ""}
                </dd>
              </div>
              {(event.contact_name || event.contact_phone) && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Contact person</dt>
                  <dd className="flex items-center gap-2">
                    {event.contact_name}
                    {event.contact_phone && (
                      <a href={`tel:${event.contact_phone}`} className="flex items-center gap-1 text-primary">
                        <Phone className="size-3.5" /> {event.contact_phone}
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  event.address || event.location_name,
                )}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Navigation className="size-4" /> Get directions
              </a>
            </Button>
          </div>

          {canManage && (
            <div className="surface-card border-destructive/40 p-5">
              <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Deleting removes the event with its registrations, photos and announcements.
              </p>
              <ConfirmDelete
                title={`Delete “${event.title}”?`}
                description="Registrations, photos and announcements for this event will be removed."
                confirmLabel="Delete event"
                disabled={removeEvent.isPending}
                onConfirm={() => removeEvent.mutate()}
                trigger={
                  <Button variant="destructive" className="mt-4 w-full">
                    <Trash2 className="size-4" /> Delete this event
                  </Button>
                }
              />
            </div>
          )}

          <DonationBanner />
          <UpcomingEventsBanner limit={3} />

          <div className="surface-card p-5">
            <h2 className="text-lg font-semibold">Volunteers</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {(event.registrations ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span>{profiles.data?.[r.volunteer_id]?.full_name ?? "Volunteer"}</span>
                  {canManage ? (
                    <Select
                      value={r.attendance}
                      onValueChange={(v) =>
                        setAttendance.mutate({ id: r.id, value: v as "pending" | "attended" | "absent" })
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="attended">Attended</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="capitalize">
                      {r.attendance}
                    </Badge>
                  )}
                </li>
              ))}
              {(event.registrations?.length ?? 0) === 0 && (
                <li className="text-muted-foreground">No volunteers yet — be the first.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}