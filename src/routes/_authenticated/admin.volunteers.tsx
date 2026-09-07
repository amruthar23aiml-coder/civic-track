import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

const ROLES = ["admin", "organizer", "volunteer"] as const;
type AppRoleName = (typeof ROLES)[number];

export const Route = createFileRoute("/_authenticated/admin/volunteers")({
  head: () => ({
    meta: [
      { title: "Volunteers & roles — CareCircle admin" },
      { name: "description", content: "View every volunteer and grant organiser or admin permissions." },
      { property: "og:title", content: "Volunteers & roles — CareCircle admin" },
      { property: "og:description", content: "Manage volunteer accounts and permissions." },
    ],
  }),
  component: AdminVolunteers,
});

function AdminVolunteers() {
  const qc = useQueryClient();

  const members = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: regs, error: regErr }] =
        await Promise.all([
          supabase.from("profiles").select("id, full_name, city").order("full_name"),
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("registrations").select("volunteer_id, attendance, hours"),
        ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      if (regErr) throw regErr;
      return (profiles ?? []).map((p) => {
        const mine = (regs ?? []).filter((r) => r.volunteer_id === p.id);
        return {
          ...p,
          roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRoleName),
          signups: mine.length,
          attended: mine.filter((r) => r.attendance === "attended").length,
          hours: mine.reduce((s, r) => s + Number(r.hours ?? 0), 0),
        };
      });
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: AppRoleName; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Roles updated.");
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout role="admin">
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="size-7 text-primary" /> Volunteers &amp; roles
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Grant the organiser role so a member can create and manage charity events.
          </p>
        </div>

        <div className="surface-card divide-y divide-border">
          {members.isLoading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
          {members.isError && (
            <p className="p-6 text-sm text-destructive">Could not load volunteers. Please try again.</p>
          )}
          {(members.data ?? []).map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{m.full_name || "Member"}</p>
                <p className="text-xs text-muted-foreground">
                  {m.city ? `${m.city} · ` : ""}
                  {m.signups} signups · {m.attended} attended · {m.hours.toFixed(1)} h
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const has = m.roles.includes(role);
                  return (
                    <Button
                      key={role}
                      size="sm"
                      variant={has ? "default" : "outline"}
                      disabled={toggleRole.isPending}
                      onClick={() => toggleRole.mutate({ userId: m.id, role, grant: !has })}
                      className="capitalize"
                    >
                      {role}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
          {!members.isLoading && (members.data ?? []).length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No members yet.</p>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
