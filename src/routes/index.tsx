import { createFileRoute, Link,redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarPlus, LocateFixed, MapPin, Recycle, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteLayout } from "@/components/SiteLayout";
import { EventCard } from "@/components/EventCard";
import { MapPanel } from "@/components/MapPanel";
import { eventsQuery, statsQuery } from "@/lib/data";
import { CATEGORIES } from "@/lib/categories";
import { geocodeAddress } from "@/lib/geocode.functions";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-cleanup.jpg";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,

  beforeLoad: async () => {
  const roleSelected =
    sessionStorage.getItem("civictrack-role-selected");

  if (roleSelected === "citizen") {
    return;
  }

    const { data } = await supabase.auth.getSession();

    if (data.session) {
      return;
    }

    throw redirect({
      to: "/choose-role",
    });
  },

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

  const { user, isAdmin, isOrganizer } = useAuth();
  const [distance, setDistance] = useState("any");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("soonest");
  const [locationQuery, setLocationQuery] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

  const { data: stats } = useQuery(statsQuery());
  const { data: events = [] } = useQuery(eventsQuery("upcoming"));
  const locateManually = useMutation({
    mutationFn: () =>
      geocodeAddress({
        data: { query: locationQuery },
      }),
    onSuccess: (result) => {
      if (!result) {
        setLocationMessage("No matching location found.");
        return;
      }

      setLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.address,
      });
      setLocationMessage(`Using ${result.address}`);
    },
    onError: (error: Error) => {
      setLocationMessage(error.message);
    },
  });

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is unavailable. Search for a location instead.",
      );
      return;
    }

    setLocationMessage("Requesting your location...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          label: "Your current location",
        });
        setLocationMessage("Using your current location.");
      },
      () => {
        setLocationMessage(
          "Location permission was unavailable. Search for a location instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const distanceBetween = (
    firstLatitude: number,
    firstLongitude: number,
    secondLatitude: number,
    secondLongitude: number,
  ) => {
    const earthRadiusKm = 6371;
    const latitudeDelta =
      ((secondLatitude - firstLatitude) * Math.PI) / 180;
    const longitudeDelta =
      ((secondLongitude - firstLongitude) * Math.PI) / 180;
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos((firstLatitude * Math.PI) / 180) *
        Math.cos((secondLatitude * Math.PI) / 180) *
        Math.sin(longitudeDelta / 2) ** 2;

    return (
      earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const maxDistance =
      distance === "any" ? null : Number(distance);

    const matching = events.filter((event) => {
      const startsAt = new Date(event.starts_at);

      if (
        categoryFilter !== "all" &&
        event.category !== categoryFilter
      ) {
        return false;
      }

      if (dateFilter === "today" && startsAt < today) {
        return false;
      }
      if (
        dateFilter === "week" &&
        (startsAt < weekStart ||
          startsAt >= new Date(weekStart.getTime() + 7 * 86400000))
      ) {
        return false;
      }
      if (
        dateFilter === "month" &&
        (startsAt < monthStart ||
          startsAt.getMonth() !== now.getMonth() ||
          startsAt.getFullYear() !== now.getFullYear())
      ) {
        return false;
      }

      if (maxDistance != null) {
        if (
          !location ||
          event.latitude == null ||
          event.longitude == null
        ) {
          return false;
        }

        if (
          distanceBetween(
            location.latitude,
            location.longitude,
            Number(event.latitude),
            Number(event.longitude),
          ) > maxDistance
        ) {
          return false;
        }
      }

      return true;
    });

    return matching.sort((first, second) => {
      if (
        sortBy === "nearest" &&
        location &&
        first.latitude != null &&
        first.longitude != null &&
        second.latitude != null &&
        second.longitude != null
      ) {
        return (
          distanceBetween(
            location.latitude,
            location.longitude,
            Number(first.latitude),
            Number(first.longitude),
          ) -
          distanceBetween(
            location.latitude,
            location.longitude,
            Number(second.latitude),
            Number(second.longitude),
          )
        );
      }

      return (
        new Date(first.starts_at).getTime() -
        new Date(second.starts_at).getTime()
      );
    });
  }, [
    categoryFilter,
    dateFilter,
    distance,
    events,
    location,
    sortBy,
  ]);

  const next = filteredEvents.slice(0, 3);

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
    returnTo: "/report",
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

      navigate({
        to: "/events/new",
      });
    }


  const tiles = [
    { label: "Clean-ups hosted", value: stats?.total_events ?? 0, icon: CalendarPlus },
    { label: "Volunteers", value: stats?.total_volunteers ?? 0, icon: Users },
    { label: "Waste collected", value: `${Math.round(stats?.total_weight_kg ?? 0)} kg`, icon: Recycle },
    { label: "Bags filled", value: stats?.total_bags ?? 0, icon: Trophy },
  ];

  return (
    <SiteLayout>
      <section className="hero-soft border-b border-border/80">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28">
          <div>
            <p className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Community action, made visible</p>
            <h1 className="mt-5 max-w-xl text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
              Better streets start with showing up.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              Report issues, join community initiatives, and track the impact your actions make. CivicTrack connects citizens and communities to create cleaner, safer, and better neighbourhoods.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
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
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-3xl" />
            <img
              src={heroImage}
              alt="Volunteers in high-visibility vests collecting litter in a sunlit park"
              width={1600}
              height={1000}
              className="relative aspect-[4/3] w-full rounded-[1.75rem] border border-white/10 object-cover shadow-2xl shadow-black/30"
            />
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-background/80 px-4 py-3 backdrop-blur-md">
              <p className="text-xs font-medium text-muted-foreground">Small actions</p>
              <p className="mt-0.5 text-sm font-semibold">Visible impact.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="surface-card p-5 transition-colors hover:border-primary/40">
              <t.icon className="size-5 text-primary" strokeWidth={1.8} />
              <p className="mt-3 text-2xl font-bold">{t.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="surface-card relative overflow-hidden space-y-5 p-6 md:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-accent/10 blur-3xl" />
          <div>
            <h2 className="relative text-2xl font-bold">
              Find initiatives near you
            </h2>
            <p className="relative mt-1 text-sm text-muted-foreground">
              Filter upcoming initiatives by distance, date, and category.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="event-distance">Distance</Label>
              <Select
                value={distance}
                onValueChange={setDistance}
              >
                <SelectTrigger id="event-distance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any distance</SelectItem>
                  {[2, 5, 10, 25].map((value) => (
                    <SelectItem
                      key={value}
                      value={String(value)}
                      disabled={!location}
                    >
                      Within {value} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="event-date">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any date</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-category">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger id="event-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-sort">Sort by</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="event-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soonest">Soonest</SelectItem>
                  <SelectItem value="nearest" disabled={!location}>
                    Nearest
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-background/40 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="event-location">
                  Set a location for distance filters
                </Label>
                <Input
                  id="event-location"
                  placeholder="Search a city, address, or landmark"
                  value={locationQuery}
                  onChange={(event) =>
                    setLocationQuery(event.target.value)
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => locateManually.mutate()}
                disabled={
                  locateManually.isPending ||
                  locationQuery.trim().length < 3
                }
              >
                {locateManually.isPending
                  ? "Searching..."
                  : "Use searched location"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={useCurrentLocation}
              >
                <LocateFixed className="mr-2 size-4" />
                Use my location
              </Button>
            </div>
            {locationMessage && (
              <p className="mt-2 text-xs text-muted-foreground">
                {locationMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Next Community Initiatives
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {filteredEvents.length} matching initiative
              {filteredEvents.length === 1 ? "" : "s"}.
            </p>
          </div>
          <Link to="/events" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {next.length === 0 ? (
          <div className="surface-card mt-6 p-6 text-sm text-muted-foreground">
            Nothing happening here... yet 👀 Try a wider distance, another
            date, or a different category.
          </div>
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
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live view</p>
              <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <MapPin className="size-6 text-primary" /> Community activity near you
              </h2>
            </div>
            <p className="hidden text-sm text-muted-foreground sm:block">Explore. Tap a pin. Show up.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/80 shadow-2xl shadow-black/20">
            <MapPanel events={filteredEvents} className="h-[420px]" />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
