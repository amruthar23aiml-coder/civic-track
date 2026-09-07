import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { EventWithRegs } from "@/lib/data";

const EventsMap = lazy(() => import("./EventsMap"));

export function MapPanel({ events, className }: { events: EventWithRegs[]; className?: string | undefined }) {
  const fallback = (
    <div className={`surface-card flex items-center justify-center p-8 text-sm text-muted-foreground ${className ?? ""}`}>
      Loading map…
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <EventsMap events={events} className={className} />
      </Suspense>
    </ClientOnly>
  );
}