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
      { name: "description", content: "Browse upcoming community clean-up events near you and sign up to volunteer." },
      { property: "og:title", content: "Upcoming clean-up events — CleanSweep" },
      { property: "og:description", content: "Find a clean-up, check the roster, and claim a volunteer spot." },
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
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Clean-up events</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pick a site, claim a spot, bring gloves.</p>
          </div>
          {isOrganizer && (
            <Button asChild>
              <Link to="/events/new">
                <Plus className="size-4" /> New event
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue="upcoming" className="mt-8">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="map">Map</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="pt-6">
            {upcoming.data?.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {upcoming.data.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events yet.</p>
            )}
          </TabsContent>
          <TabsContent value="past" className="pt-6">
            {past.data?.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {past.data.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No past events recorded.</p>
            )}
          </TabsContent>
          <TabsContent value="map" className="pt-6">
            <MapPanel events={[...(upcoming.data ?? []), ...(past.data ?? [])]} className="h-[520px]" />
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}