import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at, report_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    refetch();
  }

  if (!user) {
    return (
      <SiteLayout>
        <main className="mx-auto max-w-4xl px-4 py-16">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-3 text-muted-foreground">
            Sign in to view your notifications.
          </p>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <div className="flex items-center gap-3">
          <Bell className="size-7 text-primary" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        {notifications.length === 0 ? (
          <div className="surface-card mt-8 p-8 text-center">
            <Bell className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll see updates about your civic reports here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`surface-card flex items-start justify-between gap-4 p-5 ${
                  !notification.is_read ? "border-primary/40" : ""
                }`}
              >
                <div>
                  <h2 className="font-semibold">{notification.title}</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>

                {!notification.is_read && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <Check className="mr-1 size-4" />
                    Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </SiteLayout>
  );
}