import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocode.functions";
import { CATEGORY_GROUPS, CATEGORY_MAP, categoriesByGroup, type EventCategory } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({
    meta: [
      { title: "Create a charity event — CareCircle" },
      {
        name: "description",
        content: "Schedule a clean-up, donation drive, blood camp, plantation or tutoring programme for volunteers.",
      },
      { property: "og:title", content: "Create a charity event — CareCircle" },
      { property: "og:description", content: "Publish a charity event and start recruiting volunteers." },
    ],
  }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const { user, isOrganizer } = useAuth();
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
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const def = CATEGORY_MAP[category];

  const locate = useMutation({
    mutationFn: async () => geocodeAddress({ data: { query: form.address || form.location_name } }),
    onSuccess: (result) => {
      if (!result) {
        toast.error("No match for that address.");
        return;
      }
      setCoords({ latitude: result.latitude, longitude: result.longitude });
      setForm((f) => ({ ...f, address: result.address }));
      toast.success("Address confirmed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const cleanDetails = Object.fromEntries(
        Object.entries(details)
          .filter(([, v]) => v.trim() !== "")
          .map(([k, v]) => [k, v.trim().slice(0, 600)]),
      );
      const { data, error } = await supabase
        .from("events")
        .insert({
          organizer_id: user!.id,
          category,
          category_other: category === "other" ? categoryOther.trim().slice(0, 80) || null : null,
          details: cleanDetails,
          title: form.title.trim().slice(0, 120),
          description: form.description.trim().slice(0, 2000),
          location_name: form.location_name.trim().slice(0, 160),
          address: form.address.trim() ? form.address.trim().slice(0, 240) : null,
          landmark: form.landmark.trim() ? form.landmark.trim().slice(0, 160) : null,
          contact_name: form.contact_name.trim() ? form.contact_name.trim().slice(0, 120) : null,
          contact_phone: form.contact_phone.trim() ? form.contact_phone.trim().slice(0, 40) : null,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          capacity: Math.max(1, Math.min(1000, Number(form.capacity || 20))),
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Event published!");
      navigate({ to: "/events/$eventId", params: { eventId: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isOrganizer) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Organiser access needed</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Only organisers and admins can create charity events. Ask an admin to grant you the organiser role.
          </p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">Create a charity event</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a category — the form adapts to the details volunteers need for that kind of activity.
        </p>
        <form
          className="surface-card mt-8 space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Event type</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {CATEGORY_GROUPS.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {categoriesByGroup(group).map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <c.icon className="size-4" />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <div className="pt-1">
              <CategoryChip category={category} custom={categoryOther} />
            </div>
          </div>

          {category === "other" && (
            <div className="space-y-2">
              <Label htmlFor="category_other">Custom event type</Label>
              <Input
                id="category_other"
                required
                maxLength={80}
                placeholder="e.g. Community library setup"
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required maxLength={120} value={form.title} onChange={set("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description &amp; volunteer guidelines</Label>
            <Textarea
              id="description"
              rows={5}
              required
              maxLength={2000}
              value={form.description}
              onChange={set("description")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input id="starts_at" type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends (optional)</Label>
              <Input id="ends_at" type="datetime-local" value={form.ends_at} onChange={set("ends_at")} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-semibold">{def.label} details</p>
            <p className="mt-1 text-xs text-muted-foreground">
              These fields change with the event type and appear on the event page.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {def.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === "textarea" ? "space-y-2 sm:col-span-2" : "space-y-2"}
                >
                  <Label htmlFor={`d-${field.key}`}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`d-${field.key}`}
                      rows={3}
                      maxLength={600}
                      placeholder={field.placeholder}
                      value={details[field.key] ?? ""}
                      onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={details[field.key] ?? ""}
                      onValueChange={(v) => setDetails((d) => ({ ...d, [field.key]: v }))}
                    >
                      <SelectTrigger id={`d-${field.key}`}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`d-${field.key}`}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      min={field.type === "number" ? "0" : undefined}
                      maxLength={field.type === "text" ? 200 : undefined}
                      placeholder={field.placeholder}
                      value={details[field.key] ?? ""}
                      onChange={(e) => setDetails((d) => ({ ...d, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_name">Venue name</Label>
            <Input
              id="location_name"
              required
              maxLength={160}
              placeholder="Riverside Park, north entrance"
              value={form.location_name}
              onChange={set("location_name")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="flex gap-2">
              <Input id="address" maxLength={240} value={form.address} onChange={set("address")} />
              <Button type="button" variant="outline" onClick={() => locate.mutate()} disabled={locate.isPending}>
                {locate.isPending ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                Verify
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="landmark">Landmark</Label>
              <Input id="landmark" maxLength={160} value={form.landmark} onChange={set("landmark")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact person</Label>
              <Input id="contact_name" maxLength={120} value={form.contact_name} onChange={set("contact_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact number</Label>
              <Input id="contact_phone" maxLength={40} value={form.contact_phone} onChange={set("contact_phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Volunteer capacity</Label>
            <Input id="capacity" type="number" min="1" max="1000" value={form.capacity} onChange={set("capacity")} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Publish event"}
          </Button>
        </form>
      </div>
    </SiteLayout>
  );
}
