import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { earnedBadges, nextMilestone } from "@/lib/badges";
import { reportStatusLabel } from "@/components/ReportStatusProgress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "CivicTrack — My Activity" },
      {
        name: "description",
        content: "Your CivicTrack reports, events, registrations, and achievements.",
      },
      { property: "og:title", content: "CivicTrack — My Activity" },
      {
        property: "og:description",
        content: "Stay on top of your civic activity and community participation.",
      },
    ],
  }),
  component: Dashboard,
});

function imageUrl(path: string | null) {
  if (!path) return null;
  return path.startsWith("http")
    ? path
    : `${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${path}`;
}

function reportStatusTone(status: string) {
  if (status === "rejected") return "destructive" as const;
  if (status === "completed") return "default" as const;
  return "secondary" as const;
}

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
      const { data, error } = await supabase
        .from("waste_logs")
        .select("weight_kg, bags")
        .eq("user_id", user!.id);
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

  const reports = myReports.data ?? [];
  const registrations = regs.data ?? [];
  const attended = registrations.filter(
    (registration) => registration.attendance === "attended",
  ).length;
  const weight = (myLogs.data ?? []).reduce((sum, log) => sum + Number(log.weight_kg), 0);
  const badges = earnedBadges(attended, weight);
  const { nextEvent, nextWaste } = nextMilestone(attended, weight);
  const inProgress = reports.filter((report) =>
    ["verified", "assigned", "in_progress"].includes(report.status),
  ).length;
  const resolved = reports.filter((report) => report.status === "completed").length;

  const recentActivity = [
    ...reports.slice(0, 3).map((report) => ({
      id: `report-${report.id}`,
      label:
        report.status === "submitted"
          ? "Report submitted"
          : `Report ${reportStatusLabel(report.status).toLowerCase()}`,
      detail: `${report.category.replaceAll("_", " ")} · ${report.location_name || "Location added"}`,
      date:
        report.status === "completed" && report.completed_at
          ? report.completed_at
          : report.created_at,
      icon: FileText,
    })),
    ...registrations.slice(0, 3).map((registration) => {
      const event = registration.events as {
        id: string;
        title: string;
        starts_at: string;
        location_name: string;
      } | null;
      return event
        ? {
            id: `registration-${registration.id}`,
            label: "Event registration",
            detail: `${event.title} · ${event.location_name}`,
            date: event.starts_at,
            icon: CalendarDays,
          }
        : null;
    }),
  ]
    .filter((activity): activity is NonNullable<typeof activity> => activity !== null)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 5);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:py-12">
        <header className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="text-sm font-medium text-primary">My activity</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Good to see you, {profile?.full_name?.split(" ")[0] || "there"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your civic activity.
            </p>
          </div>
          <Button asChild>
            <Link to="/report">
              <Plus className="size-4" /> Report an Issue
            </Link>
          </Button>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Reports submitted", value: reports.length, icon: FileText },
            { label: "Reports in progress", value: inProgress, icon: RefreshCw },
            { label: "Reports resolved", value: resolved, icon: CheckCircle2 },
            { label: "Events joined", value: registrations.length, icon: CalendarDays },
          ].map((metric) => (
            <div key={metric.label} className="surface-card p-4 sm:p-5">
              <metric.icon className="size-4 text-primary" />
              <p className="mt-3 text-2xl font-bold">{metric.value}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Civic issues
                </p>
                <h2 className="mt-1 text-2xl font-bold">My Reports</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Follow the issues you&apos;ve raised in your community.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/my-reports">
                  View all reports <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>

            {myReports.isLoading && (
              <div className="surface-card flex items-center justify-center p-8">
                <RefreshCw className="mr-2 size-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading reports...</span>
              </div>
            )}

            {!myReports.isLoading && reports.length === 0 && (
              <div className="surface-card p-7 text-center">
                <FileText className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No reports yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Report a civic issue and follow its progress here.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/report">Report an Issue</Link>
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {reports.slice(0, 5).map((report) => (
                <Link
                  key={report.id}
                  to="/my-reports"
                  hash={`report-${report.id}`}
                  className="surface-card group flex flex-col gap-4 p-4 transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row"
                >
                  <div className="flex gap-3 sm:w-44 sm:shrink-0">
                    {report.before_image_url ? (
                      <img
                        src={imageUrl(report.before_image_url) ?? undefined}
                        alt=""
                        className="size-20 rounded-xl object-cover sm:h-20 sm:w-full"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-20 sm:w-full">
                        <FileText className="size-5" />
                      </div>
                    )}
                    {report.after_image_url && (
                      <img
                        src={imageUrl(report.after_image_url) ?? undefined}
                        alt=""
                        className="hidden size-20 rounded-xl object-cover sm:block"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold capitalize group-hover:text-primary">
                          {report.category.replaceAll("_", " ")}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {format(new Date(report.created_at), "d MMM yyyy · HH:mm")}
                        </p>
                      </div>
                      <Badge variant={reportStatusTone(report.status)} className="shrink-0">
                        {reportStatusLabel(report.status)}
                      </Badge>
                    </div>
                    <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="truncate">
                        {report.location_name || report.address || "Location not provided"}
                      </span>
                    </p>
                    {report.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="surface-card p-5">
              <h2 className="text-lg font-semibold">Quick actions</h2>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Report an Issue", to: "/report", icon: FileText },
                  { label: "Browse Events", to: "/events", icon: CalendarDays },
                  { label: "Community Reports", to: "/reports", icon: MapPin },
                  { label: "My Reports", to: "/my-reports", icon: CheckCircle2 },
                ].map((action) => (
                  <Button
                    key={action.to}
                    asChild
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Link to={action.to}>
                      <action.icon className="size-4 text-primary" />
                      {action.label}
                      <ArrowUpRight className="ml-auto size-4 text-muted-foreground" />
                    </Link>
                  </Button>
                ))}
              </div>
            </section>

            <section className="surface-card p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-lg font-semibold">Achievements</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {badges.length > 0 ? (
                  badges.map((badge) => (
                    <Badge
                      key={badge.id}
                      variant="secondary"
                      className="gap-1"
                      title={badge.description}
                    >
                      <badge.icon className="size-3" /> {badge.label}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Join an event to start earning achievements.
                  </p>
                )}
              </div>
              {(nextEvent || nextWaste) && (
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {nextEvent &&
                    `${nextEvent.threshold - attended} more event(s) to unlock ${nextEvent.badge.label}. `}
                  {nextWaste &&
                    `${(nextWaste.threshold - weight).toFixed(1)} kg more to unlock ${nextWaste.badge.label}.`}
                </p>
              )}
            </section>
          </aside>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Timeline
                </p>
                <h2 className="mt-1 text-xl font-bold">Recent activity</h2>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="relative flex w-8 justify-center">
                      <div className="z-10 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <activity.icon className="size-4" />
                      </div>
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className="text-sm font-medium">{activity.label}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {activity.detail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(activity.date), "d MMM yyyy · HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your recent civic activity will appear here.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Participation
                </p>
                <h2 className="mt-1 text-xl font-bold">My registrations</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/events">Browse events</Link>
              </Button>
            </div>
            <div className="mt-4 divide-y divide-border">
              {registrations.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  No registrations yet. Browse events to find your next initiative.
                </p>
              ) : (
                registrations.slice(0, 4).map((registration) => {
                  const event = registration.events as {
                    id: string;
                    title: string;
                    starts_at: string;
                    location_name: string;
                  } | null;
                  if (!event) return null;
                  return (
                    <Link
                      key={registration.id}
                      to="/events/$eventId"
                      params={{ eventId: event.id }}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {format(new Date(event.starts_at), "d MMM yyyy · HH:mm")} ·{" "}
                          {event.location_name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {registration.attendance}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {isOrganizer && (
          <section className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Organizer workspace
                </p>
                <h2 className="mt-1 text-xl font-bold">Events I organise</h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/events/new">Create event</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(myEvents.data ?? []).slice(0, 4).map((event) => (
                <Link
                  key={event.id}
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <Badge variant="secondary" className="capitalize">
                      {event.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(event.starts_at), "d MMM yyyy · HH:mm")} ·{" "}
                    {event.registrations?.length ?? 0} joined
                  </p>
                </Link>
              ))}
              {(myEvents.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t created any events yet.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
