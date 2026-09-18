import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Plus,
  Recycle,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { earnedBadges, nextMilestone } from "@/lib/badges";
import {
  ReportStatusProgress,
  reportStatusLabel,
} from "@/components/ReportStatusProgress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My clean-up dashboard — CleanSweep" },
      { name: "description", content: "Your registrations, attendance record, waste logged, and earned badges." },
      { property: "og:title", content: "My clean-up dashboard — CleanSweep" },
      { property: "og:description", content: "Track your clean-up participation and impact." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, isOrganizer } = useAuth();

  const regs = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, attendance, events(id, title, starts_at, location_name, status)")
        .eq("volunteer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myLogs = useQuery({
    queryKey: ["my-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("waste_logs").select("weight_kg, bags").eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const myEvents = useQuery({
    queryKey: ["my-events", user?.id],
    enabled: !!user && isOrganizer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, starts_at, status, registrations(id)")
        .eq("organizer_id", user!.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const myReports = useQuery({
    queryKey: ["dashboard-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, category, description, location_name, address, latitude, longitude, before_image_url, after_image_url, status, created_at, completed_at",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const attended = (regs.data ?? []).filter((r) => r.attendance === "attended").length;
  const weight = (myLogs.data ?? []).reduce((s, l) => s + Number(l.weight_kg), 0);
  const bags = (myLogs.data ?? []).reduce((s, l) => s + l.bags, 0);
  const badges = earnedBadges(attended, weight);
  const { nextEvent, nextWaste } = nextMilestone(attended, weight);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hi {profile?.full_name?.split(" ")[0] || "there"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your clean-up activity and impact.</p>
          </div>
          {isOrganizer && (
            <Button asChild>
              <Link to="/events/new">
                <Plus className="size-4" /> Create event
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Clean-ups attended", value: attended, icon: CalendarDays },
            { label: "Waste collected", value: `${weight.toFixed(1)} kg`, icon: Recycle },
            { label: "Bags filled", value: bags, icon: Recycle },
            { label: "Badges earned", value: badges.length, icon: Trophy },
          ].map((t) => (
            <div key={t.label} className="surface-card p-5">
              <t.icon className="size-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">{t.value}</p>
              <p className="text-sm text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>

        <section className="surface-card p-5">
          <h2 className="text-lg font-semibold">Badges</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.length === 0 && (
              <p className="text-sm text-muted-foreground">Attend your first clean-up to earn a badge.</p>
            )}
            {badges.map((b) => (
              <Badge key={b.id} variant="secondary" className="gap-1" title={b.description}>
                <b.icon className="size-3" /> {b.label}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {nextEvent && `${nextEvent.threshold - attended} more clean-up(s) to unlock ${nextEvent.badge.label}. `}
            {nextWaste && `${(nextWaste.threshold - weight).toFixed(1)} kg more to unlock ${nextWaste.badge.label}.`}
          </p>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">My Reports</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track every civic issue you have submitted.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/my-reports">View all reports</Link>
            </Button>
          </div>

          {myReports.isLoading && (
            <div className="surface-card mt-3 flex items-center justify-center p-8">
              <RefreshCw className="mr-2 size-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading your reports...
              </span>
            </div>
          )}

          {!myReports.isLoading &&
            (myReports.data ?? []).length === 0 && (
              <div className="surface-card mt-3 p-6 text-sm text-muted-foreground">
                You have not submitted any civic reports yet.
              </div>
            )}

          <div className="mt-3 grid gap-5 lg:grid-cols-2">
            {(myReports.data ?? []).map((report) => (
              <article
                key={report.id}
                className="surface-card overflow-hidden"
              >
                {report.before_image_url && (
                  <img
                    src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.before_image_url}`}
                    alt="Reported civic issue"
                    className="h-52 w-full object-cover"
                  />
                )}
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {report.category.replaceAll("_", " ")}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted{" "}
                        {format(
                          new Date(report.created_at),
                          "d MMM yyyy · HH:mm",
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        report.status === "rejected"
                          ? "destructive"
                          : report.status === "completed"
                            ? "default"
                            : "secondary"
                      }
                      className="shrink-0"
                    >
                      {reportStatusLabel(report.status)}
                    </Badge>
                  </div>

                  {report.description && (
                    <p className="text-sm text-muted-foreground">
                      {report.description}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        report.latitude != null &&
                        report.longitude != null
                      ) {
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                    className="flex w-full items-start gap-2 rounded-lg bg-muted p-3 text-left text-sm"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">
                      {report.location_name ||
                        report.address ||
                        "Location not provided"}
                    </span>
                  </button>

                  <ReportStatusProgress status={report.status} />

                  {report.after_image_url && (
                    <img
                      src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.after_image_url}`}
                      alt="Resolved civic issue"
                      className="h-44 w-full rounded-lg object-cover"
                    />
                  )}

                  {report.completed_at && (
                    <p className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-xs text-green-700">
                      <CheckCircle2 className="size-4" />
                      Completed{" "}
                      {format(
                        new Date(report.completed_at),
                        "d MMM yyyy · HH:mm",
                      )}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">My registrations</h2>
          <div className="surface-card mt-3 divide-y divide-border">
            {(regs.data ?? []).length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">
                No registrations yet.{" "}
                <Link to="/events" className="text-primary hover:underline">
                  Browse clean-ups
                </Link>
                .
              </p>
            )}
            {(regs.data ?? []).map((r) => {
              const ev = r.events as { id: string; title: string; starts_at: string; location_name: string } | null;
              if (!ev) return null;
              return (
                <Link
                  key={r.id}
                  to="/events/$eventId"
                  params={{ eventId: ev.id }}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-secondary/60"
                >
                  <div>
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ev.starts_at), "d MMM yyyy · HH:mm")} — {ev.location_name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {r.attendance}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>

        {isOrganizer && (
          <section>
            <h2 className="text-lg font-semibold">Events I organise</h2>
            <div className="surface-card mt-3 divide-y divide-border">
              {(myEvents.data ?? []).length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">You haven't created any events yet.</p>
              )}
              {(myEvents.data ?? []).map((e) => (
                <Link
                  key={e.id}
                  to="/events/$eventId"
                  params={{ eventId: e.id }}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-secondary/60"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(e.starts_at), "d MMM yyyy · HH:mm")} · {e.registrations?.length ?? 0} signed up
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {e.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}