import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, RefreshCw } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/SiteLayout";
import {
  ReportStatusProgress,
  reportStatusLabel,
} from "@/components/ReportStatusProgress";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Community Reports — CivicTrack" },
      {
        name: "description",
        content:
          "Follow publicly visible civic issues and their resolution progress.",
      },
    ],
  }),
  component: PublicReports,
});

function PublicReports() {
  const reports = useQuery({
    queryKey: ["public-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, user_id, category, description, location_name, address, latitude, longitude, before_image_url, after_image_url, status, created_at, completed_at",
        )
        .in("status", [
          "verified",
          "assigned",
          "in_progress",
          "completed",
        ])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      const userIds = [
        ...new Set(rows.map((report) => report.user_id)),
      ];
      const { data: profiles, error: profilesError } =
        userIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", userIds)
          : { data: [], error: null };

      if (profilesError) throw profilesError;

      const profilesById = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile,
        ]),
      );

      return rows.map((report) => ({
        ...report,
        reporter: profilesById.get(report.user_id) ?? null,
      }));
    },
  });

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold">Community Reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow verified civic issues and see how our community is
            resolving them.
          </p>
        </div>

        {reports.isLoading && (
          <div className="surface-card flex items-center justify-center p-10">
            <RefreshCw className="mr-2 size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading community reports...
            </span>
          </div>
        )}

        {reports.isError && (
          <div className="surface-card p-6">
            <p className="font-medium">
              Unable to load community reports.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please refresh the page and try again.
            </p>
          </div>
        )}

        {!reports.isLoading &&
          !reports.isError &&
          (reports.data ?? []).length === 0 && (
            <div className="surface-card p-10 text-center text-sm text-muted-foreground">
              No public civic reports are available yet.
            </div>
          )}

        <div className="grid gap-6 md:grid-cols-2">
          {(reports.data ?? []).map((report) => (
            <article
              key={report.id}
              className="surface-card overflow-hidden"
            >
              {report.before_image_url && (
                <img
                  src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.before_image_url}`}
                  alt="Civic issue before resolution"
                  className="h-56 w-full object-cover"
                />
              )}

              <div className="space-y-5 p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    {report.reporter?.avatar_url && (
                      <AvatarImage
                        src={report.reporter.avatar_url}
                        alt={`${report.reporter.full_name} profile`}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(report.reporter?.full_name || "Citizen")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {report.reporter?.full_name ||
                        "CivicTrack Citizen"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(report.created_at),
                        "d MMM yyyy · HH:mm",
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={
                      report.status === "completed"
                        ? "default"
                        : "secondary"
                    }
                    className="ml-auto"
                  >
                    {reportStatusLabel(report.status)}
                  </Badge>
                </div>

                <div>
                  <p className="font-semibold capitalize">
                    {report.category.replaceAll("_", " ")}
                  </p>
                  {report.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {report.description}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    {report.location_name ||
                      report.address ||
                      "Location not provided"}
                  </span>
                </div>

                <ReportStatusProgress status={report.status} />

                {report.after_image_url && (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Resolution photo
                    </p>
                    <img
                      src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.after_image_url}`}
                      alt="Civic issue after resolution"
                      className="h-48 w-full rounded-lg object-cover"
                    />
                  </div>
                )}

                {report.completed_at && (
                  <p className="text-xs text-muted-foreground">
                    Completed{" "}
                    {format(
                      new Date(report.completed_at),
                      "d MMM yyyy · HH:mm",
                    )}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
