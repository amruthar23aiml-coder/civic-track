import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-reports")({
  head: () => ({
    meta: [
      { title: "My Reports — CivicTrack" },
      {
        name: "description",
        content: "View the garbage reports you have submitted and track their status.",
      },
    ],
  }),
  component: MyReports,
});

function MyReports() {
  const { user } = useAuth();

  const reports = useQuery({
    queryKey: ["my-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `
            id,
            title,
            description,
            category,
            status,
            location_name,
            latitude,
            longitude,
            before_image_url,
            after_image_url,
            created_at,
            updated_at,
            completed_at
          `,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "under_review":
        return "Under Review";
      case "assigned":
        return "Assigned";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "rejected":
        return "Rejected";
      default:
        return status.replaceAll("_", " ");
    }
  };

  const getStatusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "resolved":
        return "default";
      case "rejected":
        return "destructive";
      case "in_progress":
      case "assigned":
        return "secondary";
      default:
        return "outline";
    }
  };

  const openLocation = (latitude: number | null, longitude: number | null) => {
    if (latitude == null || longitude == null) return;

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Button asChild variant="ghost" className="mb-3 -ml-3">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 size-4" />
                Back to dashboard
              </Link>
            </Button>

            <h1 className="text-3xl font-bold">My Reports</h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Track the garbage issues you have reported and see their progress.
            </p>
          </div>

          <Button asChild>
            <Link to="/report">
              <Plus className="mr-2 size-4" />
              Report an issue
            </Link>
          </Button>
        </div>

        {reports.isLoading && (
          <div className="surface-card flex items-center justify-center p-10">
            <RefreshCw className="mr-2 size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Loading your reports...
            </span>
          </div>
        )}

        {reports.isError && (
          <div className="surface-card p-6">
            <p className="font-medium">Unable to load your reports.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please refresh the page and try again.
            </p>
          </div>
        )}

        {!reports.isLoading &&
          !reports.isError &&
          (reports.data ?? []).length === 0 && (
            <div className="surface-card p-10 text-center">
              <MapPin className="mx-auto size-10 text-muted-foreground" />

              <h2 className="mt-4 text-lg font-semibold">
                No reports yet
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                You haven't reported a garbage issue yet.
              </p>

              <Button asChild className="mt-5">
                <Link to="/report">Report garbage</Link>
              </Button>
            </div>
          )}

        <div className="grid gap-6 md:grid-cols-2">
          {(reports.data ?? []).map((report) => (
            <article key={report.id} className="surface-card overflow-hidden">
              {report.before_image_url && (
                <img
                  src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.before_image_url}`}
                  alt="Reported garbage"
                  className="h-56 w-full object-cover"
                />
              )}

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {report.title || "Garbage Report"}
                    </h2>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(
                        new Date(report.created_at),
                        "d MMM yyyy · HH:mm",
                      )}
                    </p>
                  </div>

                  <Badge
                    variant={getStatusVariant(report.status)}
                    className="shrink-0 capitalize"
                  >
                    {getStatusLabel(report.status)}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {report.category.replaceAll("_", " ")}
                  </p>
                </div>

                {report.description && (
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.description}
                    </p>
                  </div>
                )}

                {report.location_name && (
                  <button
                    type="button"
                    onClick={() =>
                      openLocation(
                        report.latitude,
                        report.longitude,
                      )
                    }
                    className="flex w-full items-start gap-2 rounded-lg bg-muted p-3 text-left text-sm transition hover:bg-muted/70"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />

                    <span className="text-muted-foreground">
                      {report.location_name}
                    </span>
                  </button>
                )}

                {report.after_image_url && (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Completed photo
                    </p>

                    <img
                      src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.after_image_url}`}
                      alt="Completed garbage cleanup"
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