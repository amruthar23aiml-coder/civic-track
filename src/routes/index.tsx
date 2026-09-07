import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarPlus, MapPin, Recycle, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { EventCard } from "@/components/EventCard";
import { MapPanel } from "@/components/MapPanel";
import { eventsQuery, statsQuery } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-cleanup.jpg";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [

      { title: "CivicTrack — Community Action & Impact" },
      {
        name: "description",
        content:
          "Report issues, join community initiatives, and track the impact your actions make. CivicTrack connects citizens and communities to create cleaner, safer, and better neighbourhoods..",
      },
      { property: "og:title", content: "CivicTrack — Community Action & Impact" },
      {
        property: "og:description",
        content: "Report issues, join community initiatives, and track the impact your actions make. CivicTrack connects citizens and communities to create cleaner, safer, and better neighbourhoods..",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  const {
    user,
    isAdmin,
    isOrganizer,
  } = useAuth();

  const { data: stats } = useQuery(statsQuery());
  const { data: events = [] } = useQuery(eventsQuery("upcoming"));
  const next = events.slice(0, 3);

    function handleReportIssue() {
    if (user) {
      navigate({
        to: "/report",
      });
      return;
    }

    navigate({
      to: "/auth",
      search: {
        role: "citizen",
      },
    });
  }

    function handleCreateInitiative() {
    if (!user) {
      navigate({
        to: "/auth",
        search: {
          role: "citizen",
        },
      });
      return;
    }

    if (isOrganizer || isAdmin) {
      navigate({
        to: "/events/new",
      });
      return;
    }

    toast.info(
      "Organizer access is required to create a community initiative.",
    );
  }

  const tiles = [
    { label: "Clean-ups hosted", value: stats?.total_events ?? 0, icon: CalendarPlus },
    { label: "Volunteers", value: stats?.total_volunteers ?? 0, icon: Users },
    { label: "Waste collected", value: `${Math.round(stats?.total_weight_kg ?? 0)} kg`, icon: Recycle },
    { label: "Bags filled", value: stats?.total_bags ?? 0, icon: Trophy },
  ];

  return (
    <SiteLayout>
      <section className="hero-soft border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Community Action</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              Make your community better, one action at a time.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Report issues, join community initiatives, and track the impact your actions make. CivicTrack connects citizens and communities to create cleaner, safer, and better neighbourhoods.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
  <Button
    size="lg"
    onClick={handleReportIssue}
  >
    <AlertTriangle className="mr-2 size-5" />
    Report an Issue
  </Button>

  <Button
    asChild
    size="lg"
    variant="outline"
  >
    <Link to="/events">
      <Users className="mr-2 size-5" />
      Join an Initiative
    </Link>
  </Button>

  <Button
    size="lg"
    variant="outline"
    onClick={handleCreateInitiative}
  >
    <CalendarPlus className="mr-2 size-5" />
    Create an Initiative
  </Button>
</div>
          </div>
          <img
            src={heroImage}
            alt="Volunteers in high-visibility vests collecting litter in a sunlit park"
            width={1600}
            height={1000}
            className="w-full rounded-3xl border border-border object-cover shadow-lg"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="surface-card p-5">
              <t.icon className="size-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">{t.value}</p>
              <p className="text-sm text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">Next Community Initiatives</h2>
          <Link to="/events" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {next.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No upcoming community initiatives yet — organisers can create one.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {next.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <MapPin className="size-6 text-primary" /> Community activity near you
          </h2>
          <MapPanel events={events} className="mt-6 h-[420px]" />
        </div>
      </section>
    </SiteLayout>
  );
}
