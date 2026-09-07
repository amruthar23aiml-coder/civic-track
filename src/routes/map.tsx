import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { MapPanel } from "@/components/MapPanel";
import { EventCard } from "@/components/EventCard";
import { eventsQuery } from "@/lib/data";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Clean-up site map — CleanSweep" },
      { name: "description", content: "See every community clean-up site on an interactive map with event details." },
      { property: "og:title", content: "Clean-up site map — CleanSweep" },
      { property: "og:description", content: "Interactive map of upcoming community clean-up locations." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { data: events = [] } = useQuery(eventsQuery("all"));
  const located = events.filter((e) => e.latitude != null && e.longitude != null);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Clean-up site map</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {located.length} site{located.length === 1 ? "" : "s"} pinned. Click a pin for event details.
        </p>
        <MapPanel events={events} className="mt-6 h-[560px]" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {located.slice(0, 6).map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}