import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarPlus,
  LocateFixed,
  MapPin,
  Recycle,
  Search,
  Trophy,
  Users,
  X,
} from "lucide-react";
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
    const roleSelected = sessionStorage.getItem("civictrack-role-selected");

    const citizenFromUrl = new URLSearchParams(window.location.search).get("role") === "citizen";

    if (roleSelected === "citizen" || citizenFromUrl) {
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
          "Report civic issues, join community initiatives, and track the impact your actions make with CivicTrack.",
      },
      { property: "og:title", content: "CivicTrack — Community Action & Impact" },
      {
        property: "og:description",
        content:
          "Report civic issues, join community initiatives, and track the impact your actions make with CivicTrack.",
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
  const [communitySearch, setCommunitySearch] = useState("");

  const communityFilterOptions = [
    ["all", "All"],
    ["issues", "Issues"],
    ["initiatives", "Initiatives"],
    ["events", "Events"],
  ] as const satisfies ReadonlyArray<readonly [string, string]>;
  type CommunityFilter = (typeof communityFilterOptions)[number][0];
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>("all");

  const { data: stats } = useQuery(statsQuery());
  const { data: events = [] } = useQuery(eventsQuery("upcoming"));
  const { data: communityReports = [] } = useQuery({
    queryKey: ["home-community-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, category, description, location_name, address, before_image_url, status, created_at",
        )
        .in("status", ["verified", "assigned", "in_progress", "completed"])
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });
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
      setLocationMessage("Location is unavailable. Search for a location instead.");
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
        setLocationMessage("Location permission was unavailable. Search for a location instead.");
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
    const latitudeDelta = ((secondLatitude - firstLatitude) * Math.PI) / 180;
    const longitudeDelta = ((secondLongitude - firstLongitude) * Math.PI) / 180;
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos((firstLatitude * Math.PI) / 180) *
        Math.cos((secondLatitude * Math.PI) / 180) *
        Math.sin(longitudeDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const maxDistance = distance === "any" ? null : Number(distance);

    const matching = events.filter((event) => {
      const startsAt = new Date(event.starts_at);

      if (categoryFilter !== "all" && event.category !== categoryFilter) {
        return false;
      }

      if (dateFilter === "today" && startsAt < today) {
        return false;
      }
      if (
        dateFilter === "week" &&
        (startsAt < weekStart || startsAt >= new Date(weekStart.getTime() + 7 * 86400000))
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
        if (!location || event.latitude == null || event.longitude == null) {
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

      return new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime();
    });
  }, [categoryFilter, dateFilter, distance, events, location, sortBy]);

  const next = filteredEvents.slice(0, 3);
  const discoveryQuery = communitySearch.trim().toLowerCase();
  const matchingReports = communityReports.filter((report) => {
    if (communityFilter === "initiatives" || communityFilter === "events") return false;
    if (!discoveryQuery) return true;
    return [report.category, report.description, report.location_name, report.address]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(discoveryQuery));
  });
  const matchingEvents = events.filter((event) => {
    if (communityFilter === "issues") return false;
    if (!discoveryQuery) return true;
    return [event.title, event.description, event.location_name, event.category]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(discoveryQuery));
  });
  const discoveryReports = matchingReports.slice(0, 3);
  const discoveryEvents = matchingEvents.slice(0, 3);

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
    { label: "Initiatives hosted", value: stats?.total_events ?? 0, icon: CalendarPlus },
    { label: "Community participants", value: stats?.total_volunteers ?? 0, icon: Users },
    {
      label: "Community impact",
      value: `${Math.round(stats?.total_weight_kg ?? 0)} kg`,
      icon: Recycle,
    },
    { label: "Local actions", value: stats?.total_bags ?? 0, icon: Trophy },
  ];

  return (
    <SiteLayout>
      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 md:grid-cols-[0.95fr_1.05fr] md:gap-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              CivicTrack community
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Turn local observations into local action.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Report civic issues, discover community initiatives, and follow the progress your
              participation makes in the places you call home.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" onClick={handleReportIssue} className="sm:w-auto">
                <AlertTriangle className="mr-2 size-5" />
                Report an Issue
              </Button>
              <Button asChild size="lg" variant="outline" className="sm:w-auto">
                <Link to="/events">
                  <Users className="mr-2 size-5" />
                  Join an Initiative
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={handleCreateInitiative}
                className="sm:w-auto"
              >
                <CalendarPlus className="mr-2 size-5" />
                Create an Initiative
              </Button>
            </div>
          </div>
          <img
            src={heroImage}
            alt="Community members working together in a local park"
            width={1600}
            height={1000}
            className="aspect-[16/10] w-full rounded-2xl border border-border object-cover shadow-md"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <div className="border-y border-border/70 py-6 sm:py-7">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Discover your community
            </p>
            <h2 className="text-2xl font-bold">Explore your community</h2>
            <p className="text-sm text-muted-foreground">
              Search civic issues, places, and initiatives that matter locally.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={communitySearch}
                onChange={(event) => setCommunitySearch(event.target.value)}
                placeholder="Search issues, places, or initiatives..."
                aria-label="Search issues, places, or initiatives"
                className="h-11 pl-10"
              />
              {communitySearch && (
                <button
                  type="button"
                  onClick={() => setCommunitySearch("")}
                  aria-label="Clear community search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ["all", "All"],
              ["issues", "Issues"],
              ["initiatives", "Initiatives"],
              ["events", "Events"],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={communityFilter === value ? "default" : "outline"}
                onClick={() =>
                setCommunityFilter(
                  value as "all" | "issues" | "initiatives" | "events"
                )
              }
                className="shrink-0"
              >
                {label}
              </Button>
            ))}
          </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {(communityFilter === "all" || communityFilter === "issues") && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Recent community reports</h3>
                  <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
                    View all
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {discoveryReports.length > 0 ? (
                    discoveryReports.map((report) => (
                      <Link
                        key={report.id}
                        to="/reports"
                        className="flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"
                      >
                        {report.before_image_url ? (
                          <img
                            src={
                              report.before_image_url.startsWith("http")
                                ? report.before_image_url
                                : `${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.before_image_url}`
                            }
                            alt=""
                            className="size-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                            <MapPin className="size-4 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium capitalize">
                            {report.category.replaceAll("_", " ")}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {report.location_name || report.address || "Location not provided"}
                          </p>
                        </div>
                        <span className="ml-auto shrink-0 text-xs capitalize text-muted-foreground">
                          {report.status.replaceAll("_", " ")}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No matching community reports found.
                    </p>
                  )}
                </div>
              </div>
            )}
            {(communityFilter === "all" ||
              communityFilter === "initiatives" ||
              communityFilter === "events") && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Upcoming initiatives</h3>
                  <Link to="/events" className="text-sm font-medium text-primary hover:underline">
                    View all
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {discoveryEvents.length > 0 ? (
                    discoveryEvents.map((event) => (
                      <Link
                        key={event.id}
                        to="/events/$eventId"
                        params={{ eventId: event.id }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{event.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {event.location_name} · {new Date(event.starts_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-primary">View</span>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No matching initiatives found.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Report an issue",
              description: "Help your local authority see what needs attention.",
              icon: AlertTriangle,
              to: "/report",
            },
            {
              title: "Join an initiative",
              description: "Find community-led action happening near you.",
              icon: Users,
              to: "/events",
            },
            {
              title: "Track community impact",
              description: "Follow reports, events, and progress in one place.",
              icon: BarChart3,
              to: "/dashboard",
            },
          ].map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="surface-card group p-4 transition-shadow hover:shadow-lift"
            >
              <action.icon className="size-5 text-primary" />
              <h2 className="mt-3 font-semibold group-hover:text-primary">{action.title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
        <div className="surface-card space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Discover local action
            </p>
            <h2 className="mt-1 text-2xl font-bold">Find initiatives near you</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter upcoming initiatives by distance, date, and category.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="event-distance">Distance</Label>
              <Select value={distance} onValueChange={setDistance}>
                <SelectTrigger id="event-distance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any distance</SelectItem>
                  {[2, 5, 10, 25].map((value) => (
                    <SelectItem key={value} value={String(value)} disabled={!location}>
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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="event-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
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

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="event-location">Set a location for distance filters</Label>
                <Input
                  id="event-location"
                  placeholder="Search a city, address, or landmark"
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => locateManually.mutate()}
                disabled={locateManually.isPending || locationQuery.trim().length < 3}
              >
                {locateManually.isPending ? "Searching..." : "Use searched location"}
              </Button>
              <Button type="button" variant="outline" onClick={useCurrentLocation}>
                <LocateFixed className="mr-2 size-4" />
                Use my location
              </Button>
            </div>
            {locationMessage && (
              <p className="mt-2 text-xs text-muted-foreground">{locationMessage}</p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Next Community Initiatives</h2>
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
            No initiatives match these filters. Try a wider distance, another date, or a different
            category.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {next.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden border-t border-border bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <MapPin className="size-6 text-primary" /> Community activity near you
          </h2>
          <MapPanel events={filteredEvents} className="mt-6 h-[420px]" />
        </div>
      </section>
    </SiteLayout>
  );
}
