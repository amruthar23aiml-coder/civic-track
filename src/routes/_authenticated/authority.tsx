import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/authority")({
  head: () => ({
    meta: [
      { title: "Authority Dashboard — CivicTrack" },
      {
        name: "description",
        content: "Manage community garbage reports and cleanup progress.",
      },
    ],
  }),
  component: AuthorityDashboard,
});

type ReportStatus =
  "submitted" | "verified" | "assigned" | "in_progress" | "completed" | "rejected";

const reportStatusOptions: {
  value: ReportStatus;
  label: string;
}[] = [
  { value: "submitted", label: "Submitted" },
  { value: "verified", label: "Verified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const allowedStatusTransitions: Record<ReportStatus, ReportStatus[]> = {
  submitted: ["submitted", "verified", "rejected"],
  verified: ["verified", "assigned", "rejected"],
  assigned: ["assigned", "in_progress", "rejected"],
  in_progress: ["in_progress", "completed", "rejected"],
  completed: ["completed", "in_progress", "rejected"],
  rejected: ["rejected", "submitted"],
};

async function notifyReportOwnerOfStatusChange(
  reportId: string,
  userId: string,
  status: ReportStatus,
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title: "Report status updated",
      message: `The status of your report has been updated to ${status.replaceAll("_", " ")}.`,
      report_id: reportId,
      is_read: false,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(error);
    toast.warning("Report status updated, but the notification could not be sent.");
  }
}

function AuthorityDashboard() {
  const { user, isAuthority, loading } = useAuth();
  const queryClient = useQueryClient();

  const reports = useQuery({
    queryKey: ["authority-reports"],
    enabled: !!user && isAuthority,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `
            id,
            user_id,
            title,
            description,
            category,
            status,
            location_name,
            address,
            latitude,
            longitude,
            before_image_url,
            after_image_url,
            created_at,
            updated_at,
            completed_at
          `,
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const reportRows = data ?? [];
      const userIds = [...new Set(reportRows.map((report) => report.user_id))];

      if (userIds.length === 0) {
        return reportRows.map((report) => ({
          ...report,
          reporter: null,
        }));
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        throw profilesError;
      }

      const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return reportRows.map((report) => ({
        ...report,
        reporter: profilesById.get(report.user_id) ?? null,
      }));
    },
  });

  const stats = useMemo(() => {
    const data = reports.data ?? [];

    return {
      total: data.length,
      pending: data.filter(
        (report) =>
          report.status === "submitted" ||
          report.status === "verified" ||
          report.status === "assigned",
      ).length,
      inProgress: data.filter((report) => report.status === "in_progress").length,
      completed: data.filter((report) => report.status === "completed").length,
    };
  }, [reports.data]);

  const updateStatus = async (reportId: string, newStatus: ReportStatus) => {
    const currentReport = reports.data?.find((report) => report.id === reportId);

    if (
      !currentReport ||
      !allowedStatusTransitions[currentReport.status as ReportStatus]?.includes(newStatus)
    ) {
      toast.error("That status transition is not available.");
      return;
    }

    if (currentReport.status === newStatus) {
      return;
    }

    const updateData: {
      status: ReportStatus;
      completed_at?: string | null;
    } = {
      status: newStatus,
    };

    updateData.completed_at =
      newStatus === "completed" ? (currentReport.completed_at ?? new Date().toISOString()) : null;

    const { data: updatedReports, error } = await supabase
      .from("reports")
      .update(updateData)
      .eq("id", reportId)
      .eq("status", currentReport.status)
      .select("id");

    if (error) {
      console.error(error);
      toast.error("Could not update the report status.");
      return;
    }

    if (!updatedReports?.length) {
      toast.error("The report status changed elsewhere. Please try again.");
      await queryClient.invalidateQueries({
        queryKey: ["authority-reports"],
      });
      return;
    }

    await notifyReportOwnerOfStatusChange(reportId, currentReport.user_id, newStatus);

    toast.success(`Report marked as ${newStatus.replaceAll("_", " ")}.`);

    await queryClient.invalidateQueries({
      queryKey: ["authority-reports"],
    });
  };

  const uploadCleanupPhoto = async (reportId: string, file: File) => {
    try {
      const currentReport = reports.data?.find((report) => report.id === reportId);
      if (!currentReport) {
        toast.error("Could not find the report to update.");
        return;
      }

      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const fileName = `cleanup/after-${reportId}-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        toast.error("Could not upload the resolution photo.");
        return;
      }

      const { data: updatedReports, error: updateError } = await supabase
        .from("reports")
        .update({
          after_image_url: fileName,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .eq("status", currentReport.status)
        .select("id");

      if (updateError) {
        console.error(updateError);
        toast.error("Photo uploaded, but the report could not be completed.");
        return;
      }

      if (!updatedReports?.length) {
        toast.error("Photo uploaded, but the report status changed before the update.");
        await queryClient.invalidateQueries({
          queryKey: ["authority-reports"],
        });
        return;
      }

      if (currentReport.status !== "completed") {
        await notifyReportOwnerOfStatusChange(reportId, currentReport.user_id, "completed");
      }

      toast.success("Resolution photo uploaded and report completed.");

      await queryClient.invalidateQueries({
        queryKey: ["authority-reports"],
      });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while uploading the photo.");
    }
  };

  const openLocation = (latitude: number | null, longitude: number | null) => {
    if (latitude == null || longitude == null) {
      toast.error("Location coordinates are not available.");
      return;
    }

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const statusLabel = (status: string) => status.replaceAll("_", " ");

  if (loading) {
    return (
      <SiteLayout role="authority">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="surface-card flex items-center justify-center p-10">
            <RefreshCw className="mr-2 size-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Checking authority access...</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!user || !isAuthority) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <SiteLayout role="authority">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10">
        {/* Header */}
        <section className="surface-card overflow-hidden">
          <div className="bg-primary/10 p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-lg bg-primary/15 p-2">
                    <ShieldCheck className="size-6 text-primary" />
                  </div>

                  <Badge variant="secondary">Authority Control Panel</Badge>
                </div>

                <h1 className="text-3xl font-bold tracking-tight">CivicTrack Authority</h1>

                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Review citizen garbage reports, manage cleanup progress, and confirm completed
                  civic actions.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["authority-reports"],
                  })
                }
                disabled={reports.isFetching}
              >
                <RefreshCw className={`mr-2 size-4 ${reports.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reports Received</p>
                <p className="mt-2 text-3xl font-bold">{stats.total}</p>
              </div>

              <div className="rounded-full bg-primary/10 p-3">
                <TriangleAlert className="size-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="mt-2 text-3xl font-bold">{stats.pending}</p>
              </div>

              <div className="rounded-full bg-warning/10 p-3">
                <Clock3 className="size-5 text-warning" />
              </div>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="mt-2 text-3xl font-bold">{stats.inProgress}</p>
              </div>

              <div className="rounded-full bg-information/10 p-3">
                <RefreshCw className="size-5 text-information" />
              </div>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="mt-2 text-3xl font-bold">{stats.completed}</p>
              </div>

              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle2 className="size-5 text-success" />
              </div>
            </div>
          </div>
        </section>

        {/* Reports */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Community Reports</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Reports submitted by CivicTrack citizens.
            </p>
          </div>

          {reports.isLoading && (
            <div className="surface-card flex items-center justify-center p-12">
              <RefreshCw className="mr-2 size-4 animate-spin" />
              Loading community reports...
            </div>
          )}

          {reports.isError && (
            <div className="surface-card p-6">
              <p className="font-medium">Unable to load community reports.</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Please refresh the page and try again.
              </p>

              {reports.error instanceof Error && (
                <p className="mt-3 text-xs text-destructive">{reports.error.message}</p>
              )}
            </div>
          )}

          {!reports.isLoading && !reports.isError && reports.data?.length === 0 && (
            <div className="surface-card p-12 text-center">
              <MapPin className="mx-auto size-10 text-muted-foreground" />

              <h2 className="mt-4 text-lg font-semibold">No community reports</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                New community reports will appear here.
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {(reports.data ?? []).map((report) => (
              <article key={report.id} className="surface-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-5 pb-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-11 border border-primary/20">
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

                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {report.reporter?.full_name || "CivicTrack Citizen"}
                      </p>

                      <p className="truncate text-sm text-muted-foreground">
                        {report.location_name || report.address || "Location not provided"}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => toast.info("Secure reporter contact will be available soon.")}
                  >
                    <MessageCircle className="mr-2 size-4" />
                    Contact Reporter
                  </Button>
                </div>

                {/* Before Photo */}
                {report.before_image_url && (
                  <img
                    src={
                      `${import.meta.env["VITE_SUPABASE_URL"]}` +
                      `/storage/v1/object/public/report-photos/` +
                      `${report.before_image_url}`
                    }
                    alt="Reported garbage"
                    className="h-60 w-full object-cover"
                  />
                )}

                <div className="space-y-5 p-6">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {report.title || "Community Report"}
                      </h3>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {format(new Date(report.created_at), "d MMM yyyy · HH:mm")}
                      </p>
                    </div>

                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {statusLabel(report.status)}
                    </Badge>
                  </div>

                  {/* Category */}
                  <div>
                    <p className="text-sm font-medium">Category</p>

                    <p className="mt-1 text-sm capitalize text-muted-foreground">
                      {report.category.replaceAll("_", " ")}
                    </p>
                  </div>

                  {/* Location */}
                  <button
                    type="button"
                    onClick={() => openLocation(report.latitude, report.longitude)}
                    className="flex w-full items-start gap-3 rounded-xl bg-muted p-4 text-left transition hover:bg-muted/70"
                  >
                    <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />

                    <div>
                      <p className="text-sm font-medium">Report Location</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {report.location_name || report.address || "Location not provided"}
                      </p>
                    </div>
                  </button>

                  {/* Description */}
                  {report.description && (
                    <div>
                      <p className="text-sm font-medium">Citizen Description</p>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Update Report Status</p>

                    <select
                      value={report.status}
                      onChange={(event) =>
                        updateStatus(report.id, event.target.value as ReportStatus)
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
                    >
                      {reportStatusOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={
                            !allowedStatusTransitions[report.status as ReportStatus]?.includes(
                              option.value,
                            )
                          }
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-muted-foreground">
                      Follow the workflow: Submitted → Verified → Assigned → In Progress →
                      Completed. Rejected is available when the issue cannot be accepted or
                      resolved.
                    </p>
                  </div>

                  {/* Resolution */}
                  <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Upload className="size-4 text-primary" />

                      <p className="text-sm font-semibold">Resolution</p>
                    </div>

                    {report.after_image_url ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Before
                            </p>
                            {report.before_image_url ? (
                              <img
                                src={
                                  `${import.meta.env["VITE_SUPABASE_URL"]}` +
                                  `/storage/v1/object/public/report-photos/` +
                                  `${report.before_image_url}`
                                }
                                alt="Issue before resolution"
                                className="h-44 w-full rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-44 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                                No before image
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              After
                            </p>
                            <img
                              src={
                                `${import.meta.env["VITE_SUPABASE_URL"]}` +
                                `/storage/v1/object/public/report-photos/` +
                                `${report.after_image_url}`
                              }
                              alt="Issue after resolution"
                              className="h-44 w-full rounded-lg object-cover"
                            />
                          </div>
                        </div>

                        <p className="text-xs font-medium text-success">Resolved</p>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-3 text-xs text-muted-foreground">
                          Upload a photo after the issue has been resolved. This will mark the
                          report as completed.
                        </p>

                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                          <Upload className="mr-2 size-4" />
                          Upload Resolution Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];

                              if (file) {
                                uploadCleanupPhoto(report.id, file);
                              }

                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Resolved */}
                  {report.completed_at && (
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm">
                      <CheckCircle2 className="size-4 text-success" />

                      <span>
                        Resolved on {format(new Date(report.completed_at), "d MMM yyyy · HH:mm")}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">Report ID: {report.id}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
