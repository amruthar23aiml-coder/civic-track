function reportStatusTextClass(status: string) {
  switch (status) {
    case "submitted":
      return "text-information";
    case "verified":
      return "text-teal";
    case "assigned":
      return "text-chart-4";
    case "in_progress":
      return "text-warning";
    case "completed":
    case "resolved":
      return "text-success";
    case "rejected":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function reportStatusClass(status: string) {
  switch (status) {
    case "submitted":
      return `border-information/30 bg-information/10 ${reportStatusTextClass(status)}`;
    case "verified":
      return `border-teal/30 bg-teal/10 ${reportStatusTextClass(status)}`;
    case "assigned":
      return `border-chart-4/30 bg-chart-4/10 ${reportStatusTextClass(status)}`;
    case "in_progress":
      return `border-warning/30 bg-warning/10 ${reportStatusTextClass(status)}`;
    case "completed":
    case "resolved":
      return `border-success/30 bg-success/10 ${reportStatusTextClass(status)}`;
    case "rejected":
      return `border-destructive/30 bg-destructive/10 ${reportStatusTextClass(status)}`;
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export { reportStatusTextClass };
