import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, CalendarDays, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CategoryChip } from "@/components/CategoryChip";
import { donationsQuery, eventsQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

const GOAL = 250000;

export function DonationBanner({ className }: { className?: string }) {
  const donations = useQuery(donationsQuery());
  const raised = (donations.data ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const pct = Math.min(100, Math.round((raised / GOAL) * 100));

  return (
    <div className={cn("surface-card overflow-hidden", className)}>
      <div className="hero-gradient p-5">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-background/15">
          <HeartHandshake className="size-5" />
        </span>
        <h2 className="mt-3 text-lg font-semibold">Support Our Community Initiatives</h2>
        <p className="mt-1 text-sm opacity-85">
          Every contribution funds meals, saplings, books and relief kits for the people who need them most.
        </p>
      </div>
      <div className="space-y-3 p-5">
        <Progress value={pct} className="h-2" />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">₹{raised.toLocaleString("en-IN")}</span> raised of ₹
          {GOAL.toLocaleString("en-IN")} goal
        </p>
        <Button asChild className="w-full">
          <Link to="/donate">Donate now</Link>
        </Button>
      </div>
    </div>
  );
}

export function UpcomingEventsBanner({ limit = 4, className }: { limit?: number; className?: string }) {
  const events = useQuery(eventsQuery("upcoming"));
  const list = (events.data ?? []).slice(0, limit);

  return (
    <div className={cn("surface-card p-5", className)}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarDays className="size-5 text-primary" /> Upcoming events
      </h2>
      <ul className="mt-4 space-y-3">
        {events.isLoading && <li className="text-sm text-muted-foreground">Loading events…</li>}
        {!events.isLoading && list.length === 0 && (
          <li className="text-sm text-muted-foreground">No upcoming events scheduled yet.</li>
        )}
        {list.map((e) => (
          <li key={e.id}>
            <Link
              to="/events/$eventId"
              params={{ eventId: e.id }}
              className="block rounded-xl border border-border p-3 transition-colors hover:bg-secondary/60"
            >
              <p className="text-sm font-medium">{e.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {format(new Date(e.starts_at), "d MMM yyyy · HH:mm")}
              </p>
              <CategoryChip category={e.category} custom={e.category_other} className="mt-2" />
            </Link>
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link to="/events">
          View all events <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

export function SideBanners({ className }: { className?: string }) {
  return (
    <aside className={cn("space-y-6", className)}>
      <DonationBanner />
      <UpcomingEventsBanner />
    </aside>
  );
}
