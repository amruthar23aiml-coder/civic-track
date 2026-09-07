import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, roles } = useAuth();

  if (loading || roles.length === 0) {
    if (!isAdmin) {
      return (
        <SiteLayout role="admin">
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        </SiteLayout>
      );
    }
  }

  if (!isAdmin) {
    return (
      <SiteLayout role="volunteer">
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Admins only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This area is restricted to platform administrators.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to my dashboard</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return <Outlet />;
}
