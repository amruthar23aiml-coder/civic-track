import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, RefreshCw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SiteLayout } from "@/components/SiteLayout";
import { ReportStatusProgress, reportStatusLabel } from "@/components/ReportStatusProgress";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Community Reports — CivicTrack" },
      {
        name: "description",
        content: "Follow publicly visible civic issues and their resolution progress.",
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
        .in("status", ["verified", "assigned", "in_progress", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      const userIds = [...new Set(rows.map((report) => report.user_id))];
      const { data: profiles, error: profilesError } =
        userIds.length > 0
          ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
          : { data: [], error: null };

      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return rows.map((report) => ({
        ...report,
        reporter: profilesById.get(report.user_id) ?? null,
      }));
    },
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const categoryOptions = useMemo(
    () => [...new Set((reports.data ?? []).map((report) => report.category))].sort(),
    [reports.data],
  );
  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (reports.data ?? []).filter((report) => {
      const matchesCategory = category === "all" || report.category === category;
      const matchesStatus = status === "all" || report.status === status;
      const matchesSearch =
        !query ||
        [report.category, report.description, report.location_name, report.address]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [category, reports.data, search, status]);

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold">Community Reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover civic issues reported by the community.
          </p>
        </div>

        <div className="surface-card space-y-4 p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by issue, location, or category..."
              aria-label="Search by issue, location, or category"
              className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear report search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All statuses</option>
                {["verified", "assigned", "in_progress", "completed"].map((option) => (
                  <option key={option} value={option}>
                    {reportStatusLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {reports.isLoading && (
          <div className="surface-card flex items-center justify-center p-10">
            <RefreshCw className="mr-2 size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading community reports...</span>
          </div>
        )}

        {reports.isError && (
          <div className="surface-card p-6">
            <p className="font-medium">Unable to load community reports.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please refresh the page and try again.
            </p>
          </div>
        )}

        {!reports.isLoading && !reports.isError && filteredReports.length === 0 && (
          <div className="surface-card p-10 text-center text-sm text-muted-foreground">
            <p>No matching reports found</p>
            {(search || category !== "all" || status !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setStatus("all");
                }}
                className="mt-3 text-primary hover:underline"
              >
                Clear search and filters
              </button>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {filteredReports.map((report) => (
            <article key={report.id} className="surface-card overflow-hidden">
              {report.before_image_url && (
                <img
                  src={
                    report.before_image_url?.startsWith("http")
                      ? report.before_image_url
                      : `${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.before_image_url}`
                  }
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
                      {(report.reporter?.full_name || "Citizen").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {report.reporter?.full_name || "CivicTrack Citizen"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.created_at), "d MMM yyyy · HH:mm")}
                    </p>
                  </div>
                  <Badge
                    variant={report.status === "completed" ? "default" : "secondary"}
                    className="ml-auto"
                  >
                    {reportStatusLabel(report.status)}
                  </Badge>
                </div>

                <div>
                  <p className="font-semibold capitalize">{report.category.replaceAll("_", " ")}</p>
                  {report.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
                  )}
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    {report.location_name || report.address || "Location not provided"}
                  </span>
                </div>

                <ReportStatusProgress status={report.status} />

                {report.after_image_url && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Resolution photo</p>
                    <img
                      src={`${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${report.after_image_url}`}
                      alt="Civic issue after resolution"
                      className="h-48 w-full rounded-lg object-cover"
                    />
                  </div>
                )}

                {report.completed_at && (
                  <p className="text-xs text-muted-foreground">
                    Completed {format(new Date(report.completed_at), "d MMM yyyy · HH:mm")}
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
