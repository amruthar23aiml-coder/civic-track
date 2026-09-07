import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type Registration = Database["public"]["Tables"]["registrations"]["Row"];
export type WasteLog = Database["public"]["Tables"]["waste_logs"]["Row"];
export type EventPhoto = Database["public"]["Tables"]["event_photos"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type EventWithRegs = EventRow & {
  registrations: Pick<Registration, "id" | "volunteer_id" | "attendance">[];
};

export const eventsQuery = (scope: "upcoming" | "past" | "all" = "upcoming") => ({
  queryKey: ["events", scope],
  queryFn: async (): Promise<EventWithRegs[]> => {
    let q = supabase
      .from("events")
      .select("*, registrations(id, volunteer_id, attendance)")
      .order("starts_at", { ascending: scope !== "past" });
    const nowIso = new Date().toISOString();
    if (scope === "upcoming") q = q.gte("starts_at", nowIso);
    if (scope === "past") q = q.lt("starts_at", nowIso);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as EventWithRegs[];
  },
});

export const eventQuery = (id: string) => ({
  queryKey: ["event", id],
  queryFn: async (): Promise<EventWithRegs | null> => {
    const { data, error } = await supabase
      .from("events")
      .select("*, registrations(id, volunteer_id, attendance)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as EventWithRegs) ?? null;
  },
});

export const profilesQuery = (ids: string[]) => ({
  queryKey: ["profiles", [...ids].sort().join(",")],
  enabled: ids.length > 0,
  queryFn: async (): Promise<Record<string, Profile>> => {
    const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((p) => [p.id, p]));
  },
});

export const wasteLogsQuery = (eventId: string) => ({
  queryKey: ["waste-logs", eventId],
  queryFn: async (): Promise<WasteLog[]> => {
    const { data, error } = await supabase
      .from("waste_logs")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const photosQuery = (eventId: string) => ({
  queryKey: ["photos", eventId],
  queryFn: async (): Promise<EventPhoto[]> => {
    const { data, error } = await supabase
      .from("event_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export type LeaderboardRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  events_attended: number;
  total_weight_kg: number;
  total_bags: number;
};

export const leaderboardQuery = () => ({
  queryKey: ["leaderboard"],
  queryFn: async (): Promise<LeaderboardRow[]> => {
    const { data, error } = await supabase.rpc("leaderboard", { _limit: 50 });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, total_weight_kg: Number(r.total_weight_kg) }));
  },
});

export const statsQuery = () => ({
  queryKey: ["platform-stats"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("platform_stats");
    if (error) throw error;
    const row = data?.[0];
    return {
      total_events: Number(row?.total_events ?? 0),
      total_volunteers: Number(row?.total_volunteers ?? 0),
      total_registrations: Number(row?.total_registrations ?? 0),
      total_weight_kg: Number(row?.total_weight_kg ?? 0),
      total_bags: Number(row?.total_bags ?? 0),
      attended_count: Number(row?.attended_count ?? 0),
    };
  },
});

export async function signPhotoUrls(paths: string[]) {
  if (paths.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.storage.from("event-photos").createSignedUrls(paths, 3600);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).filter((d) => d.signedUrl).map((d) => [d.path as string, d.signedUrl]),
  ) as Record<string, string>;
}
export type Donation = Database["public"]["Tables"]["donations"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

export const donationsQuery = (eventId?: string) => ({
  queryKey: ["donations", eventId ?? "all"],
  queryFn: async (): Promise<Donation[]> => {
    let q = supabase.from("donations").select("*").order("created_at", { ascending: false });
    if (eventId) q = q.eq("event_id", eventId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
});

export const announcementsQuery = (eventId?: string) => ({
  queryKey: ["announcements", eventId ?? "all"],
  queryFn: async (): Promise<Announcement[]> => {
    let q = supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(50);
    if (eventId) q = q.eq("event_id", eventId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
});

/** Removes the storage object first, then the database row. */
export async function deletePhoto(photo: Pick<EventPhoto, "id" | "url">) {
  const { error: storageError } = await supabase.storage.from("event-photos").remove([photo.url]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("event_photos").delete().eq("id", photo.id);
  if (error) throw error;
}

/**
 * Deletes an event. Storage objects are removed explicitly; registrations,
 * photo rows, waste logs, donations and announcements cascade in the database.
 */
export async function deleteEvent(eventId: string) {
  const { data: photos } = await supabase.from("event_photos").select("url").eq("event_id", eventId);
  const paths = (photos ?? []).map((p) => p.url);
  if (paths.length > 0) await supabase.storage.from("event-photos").remove(paths);
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
}
