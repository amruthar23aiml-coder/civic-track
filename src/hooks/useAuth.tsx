import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "organizer"
  | "volunteer"
  | "authority";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;

  const {
    data: roles = [],
    isLoading: rolesLoading,
  } = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      if (error) {
        console.error(
          "Failed to load user roles:",
          error,
        );

        return [];
      }

      return (data ?? []).map(
        (item) => item.role as AppRole,
      );
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Failed to load profile:",
          error,
        );

        return null;
      }

      return data;
    },
  });

  return {
    session,
    user,
    profile,
    roles,
    loading: loading || rolesLoading,

    isAdmin: roles.includes("admin"),

    isOrganizer:
      roles.includes("organizer") ||
      roles.includes("admin"),

    isAuthority:
      roles.includes("authority"),
  };
}
