import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Medal } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leaderboardQuery } from "@/lib/data";
import { earnedBadges } from "@/lib/badges";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Volunteer leaderboard — CleanSweep" },
      {
        name: "description",
        content: "Top volunteers ranked by clean-ups attended and waste collected, with milestone badges.",
      },
      { property: "og:title", content: "Volunteer leaderboard — CleanSweep" },
      { property: "og:description", content: "See who is hauling away the most waste in the community." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: rows = [], isLoading } = useQuery(leaderboardQuery());

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Medal className="size-7 text-primary" /> Volunteer leaderboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ranked by clean-ups attended, then by total waste collected.
        </p>

        <div className="surface-card mt-8 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Volunteer</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="text-right">Waste (kg)</TableHead>
                <TableHead className="text-right">Bags</TableHead>
                <TableHead>Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No attendance recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r, i) => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-semibold">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {r.avatar_url ? <AvatarImage src={r.avatar_url} alt="" /> : null}
                        <AvatarFallback>{(r.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{r.full_name || "Volunteer"}</p>
                        {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{r.events_attended}</TableCell>
                  <TableCell className="text-right">{r.total_weight_kg.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.total_bags}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {earnedBadges(r.events_attended, r.total_weight_kg).map((b) => (
                        <UIBadge key={b.id} variant="secondary" title={b.description} className="gap-1">
                          <b.icon className="size-3" />
                          {b.label}
                        </UIBadge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SiteLayout>
  );
}