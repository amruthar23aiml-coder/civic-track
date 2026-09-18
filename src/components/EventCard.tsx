import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EventWithRegs } from "@/lib/data";

export function EventCard({ event }: { event: EventWithRegs }) {
  const signups = event.registrations?.length ?? 0;
  const pct = Math.min(100, Math.round((signups / Math.max(1, event.capacity)) * 100));

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="surface-card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_18px_45px_-24px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
    >
      {event.cover_url && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={event.cover_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-transparent to-transparent" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">{event.title}</h3>
          <Badge variant={event.status === "upcoming" ? "default" : "secondary"} className="shrink-0 capitalize">
            {event.status}
          </Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            {format(new Date(event.starts_at), "EEE d MMM yyyy · HH:mm")}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            {event.location_name}
          </p>
          <p className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-primary" />
            {signups} of {event.capacity} volunteers
          </p>
        </div>
        <Progress value={pct} className="mt-auto h-1.5" />
      </div>
    </Link>
  );
}