import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Award, CheckCircle2, Leaf, Medal, ShieldCheck, Sprout, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge as UIBadge } from "@/components/ui/badge";
import {
  impactLeaderboardQuery,
  type ImpactLeaderboardPeriod,
  type ImpactLeaderboardRow,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Volunteer leaderboard — CivicTrack" },
      {
        name: "description",
        content: "See the volunteers making measurable civic impact in their communities.",
      },
      { property: "og:title", content: "Volunteer leaderboard — CivicTrack" },
      {
        property: "og:description",
        content: "See the volunteers making measurable civic impact in their communities.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const placeStyles: Record<number, string> = {
  1: "border-amber-400/45 bg-amber-400/[0.07] shadow-[0_12px_35px_-22px_rgba(251,191,36,0.65)]",
  2: "border-slate-300/35 bg-slate-300/[0.045]",
  3: "border-orange-500/35 bg-orange-500/[0.045]",
};

function badgesFor(row: ImpactLeaderboardRow, period: ImpactLeaderboardPeriod) {
  return [
    {
      label: "Community Champion",
      detail: "Earned 500 or more impact points",
      icon: Trophy,
      earned: row.impact_points >= 500,
    },
    {
      label: "Green Volunteer",
      detail: "Completed 5 community initiatives",
      icon: Leaf,
      earned: row.initiatives_completed >= 5,
    },
    {
      label: "Problem Solver",
      detail: "Resolved 10 civic issues",
      icon: CheckCircle2,
      earned: row.issues_resolved >= 10,
    },
    {
      label: "Active Citizen",
      detail: "Has 10 verified civic reports",
      icon: ShieldCheck,
      earned: row.verified_reports >= 10,
    },
    {
      label: "Top Contributor",
      detail: "Ranked #1 this month",
      icon: Award,
      earned: period === "this_month" && row.rank_position === 1 && row.impact_points > 0,
    },
  ].filter((badge) => badge.earned);
}

function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ImpactLeaderboardPeriod>("this_month");
  const { data: rows = [], isLoading, error } = useQuery(impactLeaderboardQuery(period));
  const currentUserRow = rows.find((row) => row.user_id === user?.id);
  const nextRankRow = currentUserRow
    ? rows.find((row) => row.rank_position === currentUserRow.rank_position - 1)
    : undefined;
  const pointsToNextRank = nextRankRow
    ? Math.max(1, nextRankRow.impact_points - currentUserRow!.impact_points + 1)
    : 0;

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Medal className="size-7 text-primary" /> Volunteer leaderboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Recognizing verified participation and completed civic impact.
            </p>
          </div>
          <div className="flex w-full rounded-xl border border-border/70 bg-background/50 p-1 sm:w-auto">
            {(
              [
                ["this_month", "This Month"],
                ["all_time", "All Time"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={cn(
                  "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
                  period === value
                    ? "bg-primary/15 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {user && (
          <section className="surface-card mt-7 grid gap-4 p-4 sm:grid-cols-3 sm:gap-6 sm:p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your Rank
              </p>
              <p className="mt-1 text-2xl font-bold">
                {currentUserRow ? `#${currentUserRow.rank_position}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Impact Points
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {currentUserRow?.impact_points ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Points to reach the next rank
              </p>
              <p className="mt-1 text-2xl font-bold">
                {currentUserRow && !nextRankRow ? "You're at the top" : pointsToNextRank}
              </p>
            </div>
          </section>
        )}

        <section className="surface-card mt-7 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold">
                {period === "this_month" ? "This Month" : "All Time"} rankings
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {rows.length > 100
                  ? "Showing the top 100 and your position"
                  : rows.length
                    ? `Showing ${rows.length} volunteers`
                    : "Impact Points"}
              </p>
            </div>
            <Trophy className="size-5 text-primary" />
          </div>

          <div className="space-y-3 p-3 sm:p-5">
            {isLoading && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Loading community impact…
              </p>
            )}
            {error && (
              <p role="alert" className="py-10 text-center text-sm text-destructive">
                Could not load the leaderboard: {error.message}
              </p>
            )}
            {!isLoading && !error && rows.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No verified participation has been recorded for this period yet.
              </p>
            )}
            {!isLoading &&
              !error &&
              rows.map((row) => {
                const badges = badgesFor(row, period);
                const isCurrentUser = row.user_id === user?.id;

                return (
                  <article
                    key={row.user_id}
                    className={cn(
                      "rounded-2xl border border-border/70 bg-background/35 p-3 transition-colors sm:p-4",
                      placeStyles[row.rank_position],
                      isCurrentUser && "ring-1 ring-primary/45",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/70 font-bold",
                          row.rank_position === 1 && "bg-amber-400/20 text-amber-300",
                          row.rank_position === 2 && "bg-slate-300/15 text-slate-200",
                          row.rank_position === 3 && "bg-orange-500/15 text-orange-300",
                        )}
                        aria-label={`Rank ${row.rank_position}`}
                      >
                        {row.rank_position === 1
                          ? "1st"
                          : row.rank_position === 2
                            ? "2nd"
                            : row.rank_position === 3
                              ? "3rd"
                              : row.rank_position}
                      </div>
                      <Avatar className="size-11 shrink-0">
                        {row.avatar_url ? <AvatarImage src={row.avatar_url} alt="" /> : null}
                        <AvatarFallback>
                          {(row.full_name || "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {row.full_name || "Volunteer"}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs font-normal text-primary">You</span>
                          )}
                        </p>
                        {row.city && (
                          <p className="truncate text-xs text-muted-foreground">{row.city}</p>
                        )}
                        {badges.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {badges.map((badge) => (
                              <UIBadge
                                key={badge.label}
                                variant="secondary"
                                title={badge.detail}
                                className="gap-1 text-[10px] sm:text-xs"
                              >
                                <badge.icon className="size-3" />
                                {badge.label}
                              </UIBadge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-auto min-w-24 text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                          Impact Points
                        </p>
                        <p className="text-xl font-bold text-primary">{row.impact_points}</p>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-3 border-t border-border/60 pt-3 pl-13 text-sm sm:w-auto sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                        <div className="sm:min-w-24">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                            Issues Resolved
                          </p>
                          <p className="font-semibold">{row.issues_resolved}</p>
                        </div>
                        <div className="sm:min-w-28">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                            Initiatives Completed
                          </p>
                          <p className="font-semibold">{row.initiatives_completed}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        <section className="surface-card mt-6 p-4 sm:p-5">
          <h2 className="font-semibold">How Impact Points work</h2>
          <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            <p>
              Valid report: <strong className="text-foreground">+10</strong>; verified report:{" "}
              <strong className="text-foreground">+15</strong>
            </p>
            <p>
              Resolved civic issue: <strong className="text-foreground">+25</strong>
            </p>
            <p>
              Join an initiative: <strong className="text-foreground">+10</strong>
            </p>
            <p>
              Attend an initiative: <strong className="text-foreground">+25</strong>
            </p>
            <p>
              Verified cleanup contribution: <strong className="text-foreground">+20</strong>{" "}
              <span className="text-xs">(not scored until verification data exists)</span>
            </p>
          </div>
        </section>

        <div className="surface-card mt-6 p-4 text-xs leading-relaxed text-muted-foreground sm:p-5">
          <div className="flex items-start gap-2">
            <Sprout className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Scores use existing report and initiative records. Report points are only awarded when
              a report reaches verified, assigned, in-progress, or completed status. The database
              has no <code>verified_at</code> timestamp, so monthly verification points are
              attributed to the report submission month; initiative attendance uses the initiative
              start date because there is no <code>attended_at</code> field. The current waste log
              schema has no verification flag, so the +20 verified contribution points are not
              awarded. Those timestamps and a verified contribution field are needed for precise
              monthly verification and cleanup scoring.
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
