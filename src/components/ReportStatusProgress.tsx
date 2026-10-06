import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { reportStatusClass, reportStatusTextClass } from "@/lib/report-status-style";

export type ReportStatus =
  "submitted" | "verified" | "assigned" | "in_progress" | "completed" | "rejected";

const workflow: { value: ReportStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "verified", label: "Verified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Resolved" },
];

const labels: Record<ReportStatus, string> = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Resolved",
  rejected: "Rejected",
};

export function reportStatusLabel(status: string) {
  return labels[status as ReportStatus] ?? status.replaceAll("_", " ");
}

export function ReportStatusProgress({
  status,
  statusDate,
}: {
  status: string;
  statusDate?: string | null;
}) {
  if (status === "rejected") {
    return (
      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-semibold">Rejected</p>
        <p className="mt-1 text-xs">This report was not accepted for resolution.</p>
      </div>
    );
  }

  const currentIndex = workflow.findIndex((step) => step.value === status);

  return (
    <div
      aria-label={`Report status: ${reportStatusLabel(status)}`}
      className="rounded-2xl border border-border/70 bg-muted/35 p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Current status
          </p>
          <p className={cn("mt-1 text-lg font-semibold", reportStatusTextClass(status))}>
            {reportStatusLabel(status)}
          </p>
        </div>
        {statusDate && (
          <p className="text-right text-xs text-muted-foreground">
            Updated
            <span className="block font-medium text-foreground/75">
              {new Date(statusDate).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
        )}
      </div>
      <div className="flex items-start">
        {workflow.map((step, index) => {
          const isComplete = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = index === currentIndex;

          const stepStatus = step.value;

          return (
            <div key={step.value} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isComplete
                      ? cn(reportStatusClass(stepStatus), isCurrent && "shadow-sm", "border-2")
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isComplete && !isCurrent ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Circle className={cn("size-3", isCurrent && "fill-current")} />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-[11px] leading-tight",
                    isCurrent
                      ? cn("font-semibold", reportStatusTextClass(stepStatus))
                      : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < workflow.length - 1 && (
                <div
                  className={cn(
                    "mt-5 h-0.5 flex-1",
                    currentIndex > index
                      ? stepStatus === "verified"
                        ? "bg-teal"
                        : stepStatus === "in_progress"
                          ? "bg-warning"
                          : stepStatus === "completed"
                            ? "bg-success"
                            : stepStatus === "assigned"
                              ? "bg-chart-4"
                              : "bg-information"
                      : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
