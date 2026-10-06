import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteLayout } from "@/components/SiteLayout";
import { EventCard } from "@/components/EventCard";
import { MapPanel } from "@/components/MapPanel";
import { eventsQuery } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Upcoming clean-up events — CleanSweep" },
      {
        name: "description",
        content: "Browse upcoming community clean-up events near you and sign up to volunteer.",
      },
      { property: "og:title", content: "Upcoming clean-up events — CleanSweep" },
      {
        property: "og:description",
        content: "Find a clean-up, check the roster, and claim a volunteer spot.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { isOrganizer } = useAuth();
  const upcoming = useQuery(eventsQuery("upcoming"));
  const past = useQuery(eventsQuery("past"));

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Community calendar
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Find your next good thing.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Pick a site, claim a spot, bring gloves. Every initiative is a small, visible way to
              move your neighbourhood forward.
            </p>
          </div>
          {isOrganizer && (
            <Button asChild className="shadow-sm">
              <Link to="/events/new">
                <Plus className="size-4" /> New event
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue="upcoming" className="mt-10">
          <TabsList className="rounded-xl border border-border/70 bg-card/70 p-1 shadow-sm">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="pt-7">
            {upcoming.data?.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {upcoming.data.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                Nothing happening here... yet 👀
              </div>
            )}
          </TabsContent>
          <TabsContent value="past" className="pt-7">
            {past.data?.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {past.data.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <div className="surface-card p-8 text-center text-sm text-muted-foreground">
                No past events recorded yet. Your impact log starts here.
              </div>
            )}
          </TabsContent>
          <TabsContent value="map" className="pt-7">
            <div className="overflow-hidden rounded-2xl border border-border/80 shadow-2xl shadow-black/20">
              <MapPanel
                events={[...(upcoming.data ?? []), ...(past.data ?? [])]}
                className="h-[520px]"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
