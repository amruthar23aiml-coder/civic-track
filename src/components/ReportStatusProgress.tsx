import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ReportStatus =
  | "submitted"
  | "verified"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected";

const workflow: { value: ReportStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "verified", label: "Verified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const labels: Record<ReportStatus, string> = {
  submitted: "Submitted",
  verified: "Verified",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

export function reportStatusLabel(status: string) {
  return labels[status as ReportStatus] ?? status.replaceAll("_", " ");
}

export function ReportStatusProgress({
  status,
}: {
  status: string;
}) {
  if (status === "rejected") {
    return (
      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-semibold">Rejected</p>
        <p className="mt-1 text-xs">
          This report was not accepted for resolution.
        </p>
      </div>
    );
  }

  const currentIndex = workflow.findIndex(
    (step) => step.value === status,
  );

  return (
    <div aria-label={`Report status: ${reportStatusLabel(status)}`}>
      <div className="flex items-start">
        {workflow.map((step, index) => {
          const isComplete =
            currentIndex >= 0 && index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step.value}
              className="flex min-w-0 flex-1 items-start"
            >
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                    isComplete
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete && !isCurrent ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-[10px] leading-tight",
                    isCurrent
                      ? "font-semibold text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < workflow.length - 1 && (
                <div
                  className={cn(
                    "mt-3 h-0.5 flex-1",
                    currentIndex > index
                      ? "bg-primary"
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
