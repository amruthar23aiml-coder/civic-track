import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Megaphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteLayout } from "@/components/SiteLayout";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { announcementsQuery, eventsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — CareCircle admin" },
      { name: "description", content: "Send announcements and reminders to registered volunteers." },
      { property: "og:title", content: "Announcements — CareCircle admin" },
      { property: "og:description", content: "Broadcast updates and event reminders to volunteers." },
    ],
  }),
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useQuery(announcementsQuery());
  const events = useQuery(eventsQuery("all"));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventId, setEventId] = useState("general");

  const post = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        author_id: user!.id,
        title: title.trim().slice(0, 140),
        body: body.trim().slice(0, 2000),
        event_id: eventId === "general" ? null : eventId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement published.");
      setTitle("");
      setBody("");
      setEventId("general");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement deleted.");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eventTitle = (id: string | null) =>
    id ? ((events.data ?? []).find((e) => e.id === id)?.title ?? "Event") : "All volunteers";

  return (
    <SiteLayout role="admin">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Megaphone className="size-7 text-primary" /> Announcements
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Post updates and reminders. Volunteers see them on the event page and their dashboard.
          </p>
          <form
            className="surface-card mt-6 space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              post.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-body">Message</Label>
              <Textarea
                id="a-body"
                rows={5}
                required
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">All volunteers</SelectItem>
                  {(events.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={post.isPending}>
              Publish announcement
            </Button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Published</h2>
          <div className="surface-card mt-3 divide-y divide-border">
            {list.isLoading && (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            )}
            {!list.isLoading && (list.data ?? []).length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No announcements yet.</p>
            )}
            {(list.data ?? []).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {eventTitle(a.event_id)} · {format(new Date(a.created_at), "d MMM yyyy HH:mm")}
                  </p>
                </div>
                <ConfirmDelete
                  title="Delete this announcement?"
                  onConfirm={() => remove.mutate(a.id)}
                  trigger={
                    <Button size="icon" variant="ghost" className="text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
