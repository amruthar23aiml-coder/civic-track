import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteLayout } from "@/components/SiteLayout";
import { CategoryChip } from "@/components/CategoryChip";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { supabase } from "@/integrations/supabase/client";
import { deleteEvent, eventsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({
    meta: [
      { title: "Manage events — CareCircle admin" },
      { name: "description", content: "Approve, update the status of, or permanently delete charity events." },
      { property: "og:title", content: "Manage events — CareCircle admin" },
      { property: "og:description", content: "Approve, edit and delete charity events." },
    ],
  }),
  component: AdminEvents,
});

function AdminEvents() {
  const qc = useQueryClient();
  const events = useQuery(eventsQuery("all"));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["platform-stats"] });
  };

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "upcoming" | "completed" | "cancelled" }) => {
      const { error } = await supabase.from("events").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event status updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("events").update({ approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approval updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      toast.success("Event deleted along with its registrations, photos and notifications.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout role="admin">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <CalendarDays className="size-7 text-primary" /> Manage events
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Approve submissions, change status, or permanently delete an event.
            </p>
          </div>
          <Button asChild>
            <Link to="/events/new">Create event</Link>
          </Button>
        </div>

        <div className="surface-card overflow-x-auto">
          {events.isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : (events.data ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No events have been created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Signed up</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(events.data ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link to="/events/$eventId" params={{ eventId: e.id }} className="font-medium hover:underline">
                        {e.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{e.location_name}</p>
                    </TableCell>
                    <TableCell>
                      <CategoryChip category={e.category} custom={e.category_other} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(e.starts_at), "d MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      {e.registrations?.length ?? 0}/{e.capacity}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={e.status}
                        onValueChange={(v) =>
                          setStatus.mutate({ id: e.id, status: v as "upcoming" | "completed" | "cancelled" })
                        }
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant={e.approved ? "secondary" : "default"}
                          disabled={approve.isPending}
                          onClick={() => approve.mutate({ id: e.id, approved: !e.approved })}
                        >
                          <Check className="size-4" /> {e.approved ? "Approved" : "Approve"}
                        </Button>
                        <ConfirmDelete
                          title={`Delete “${e.title}”?`}
                          description="Related registrations, photos and announcements will be removed too."
                          confirmLabel="Delete event"
                          onConfirm={() => remove.mutate(e.id)}
                          trigger={
                            <Button size="icon" variant="ghost" className="text-destructive">
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
