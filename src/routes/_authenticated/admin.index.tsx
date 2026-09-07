import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { donationsQuery, eventsQuery, leaderboardQuery, statsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin overview — CareCircle" },
      { name: "description", content: "Participation analytics, donation statistics and volunteer reports." },
      { property: "og:title", content: "Admin overview — CareCircle" },
      { property: "og:description", content: "Platform-wide charity programme statistics." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const stats = useQuery(statsQuery());
  const events = useQuery(eventsQuery("all"));
  const board = useQuery(leaderboardQuery());
  const donations = useQuery(donationsQuery());

  const raised = (donations.data ?? []).reduce((s, d) => s + Number(d.amount), 0);

  function downloadReport() {
    const rows = [
      ["Event", "Category", "Date", "Status", "Capacity", "Signed up", "Attended"],
      ...(events.data ?? []).map((e) => [
        e.title,
        e.category,
        format(new Date(e.starts_at), "yyyy-MM-dd HH:mm"),
        e.status,
        String(e.capacity),
        String(e.registrations?.length ?? 0),
        String((e.registrations ?? []).filter((r) => r.attendance === "attended").length),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `carecircle-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SiteLayout role="admin">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <ShieldCheck className="size-7 text-primary" /> Admin overview
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Participation analytics, donation totals and volunteer reports.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/events/new">New event</Link>
            </Button>
            <Button variant="outline" onClick={downloadReport}>
              <Download className="size-4" /> Export summary CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Events", value: stats.data?.total_events ?? 0 },
            { label: "Volunteers", value: stats.data?.total_volunteers ?? 0 },
            { label: "Registrations", value: stats.data?.total_registrations ?? 0 },
            { label: "Attendances", value: stats.data?.attended_count ?? 0 },
            { label: "Donations received", value: donations.data?.length ?? 0 },
            { label: "Funds raised", value: `₹${raised.toLocaleString("en-IN")}` },
            { label: "Waste (kg)", value: (stats.data?.total_weight_kg ?? 0).toFixed(1) },
            { label: "Bags", value: stats.data?.total_bags ?? 0 },
          ].map((t) => (
            <div key={t.label} className="surface-card p-5">
              <p className="text-2xl font-bold">{t.value}</p>
              <p className="text-sm text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className="text-lg font-semibold">Top volunteers</h2>
          <div className="surface-card mt-3 divide-y divide-border">
            {board.isLoading && <p className="p-5 text-sm text-muted-foreground">Loading rankings…</p>}
            {(board.data ?? []).slice(0, 10).map((v, i) => (
              <div key={v.user_id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="font-medium">
                  {i + 1}. {v.full_name || "Volunteer"}
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <Badge variant="secondary">{v.events_attended} events</Badge>
                  {v.total_weight_kg.toFixed(1)} kg · {v.total_bags} bags
                </span>
              </div>
            ))}
            {!board.isLoading && (board.data ?? []).length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">No attendance recorded yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Recent donations</h2>
          <div className="surface-card mt-3 divide-y divide-border">
            {(donations.data ?? []).slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{d.is_anonymous ? "Anonymous" : d.donor_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(d.created_at), "d MMM yyyy HH:mm")}</p>
                </div>
                <span className="font-semibold">₹{Number(d.amount).toLocaleString("en-IN")}</span>
              </div>
            ))}
            {(donations.data ?? []).length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">No donations recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
