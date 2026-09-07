import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CivicTrack" },
      {
        name: "description",
        content:
          "Sign in or create a CivicTrack account to join community initiatives and report civic issues.",
      },
      {
        property: "og:title",
        content: "Sign in — CivicTrack",
      },
      {
        property: "og:description",
        content:
          "Join CivicTrack to report issues and participate in community action.",
      },
    ],
  }),
  component: AuthPage,
});

async function getUserDestination(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("Could not load user roles:", error);
    return "dashboard";
  }

  const roles = (data ?? []).map((item) => String(item.role));

  if (roles.includes("authority")) {
    return "authority";
  }

  if (roles.includes("admin")) {
    return "admin";
  }

  return "dashboard";
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  async function goToDestination(userId: string) {
    const destination = await getUserDestination(userId);

    if (destination === "authority") {
      navigate({
        to: "/authority",
      });
      return;
    }

    if (destination === "admin") {
      navigate({
        to: "/admin",
      });
      return;
    }

    navigate({
      to: "/dashboard",
    });
  }

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    goToDestination(user.id);
  }, [loading, user]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (!data.user) {
      setBusy(false);
      toast.error("Unable to sign in.");
      return;
    }

    toast.success("Signed in successfully.");

    await goToDestination(data.user.id);

    setBusy(false);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          window.location.origin + "/auth",
        data: {
          full_name: fullName,
        },
      },
    });

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      "Account created — check your inbox if confirmation is required."
    );
  }

  async function google() {
    setBusy(true);

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            window.location.origin + "/auth",
        },
      });

    if (error) {
      setBusy(false);
      toast.error(error.message);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <span className="leaf-gradient mx-auto flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
            <Leaf className="size-6" />
          </span>

          <h1 className="mt-4 text-3xl font-bold">
            Welcome to CivicTrack
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to report civic issues, join community
            initiatives, and track your impact.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={google}
          className="w-full"
          disabled={busy}
        >
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs
          defaultValue="signin"
          className="surface-card p-5"
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="signin"
              className="flex-1"
            >
              Sign in
            </TabsTrigger>

            <TabsTrigger
              value="signup"
              className="flex-1"
            >
              Create account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form
              className="space-y-4 pt-4"
              onSubmit={signIn}
            >
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email
                </Label>

                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={busy}
              >
                {busy
                  ? "Signing in..."
                  : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form
              className="space-y-4 pt-4"
              onSubmit={signUp}
            >
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full name
                </Label>

                <Input
                  id="name"
                  required
                  maxLength={80}
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email2">
                  Email
                </Label>

                <Input
                  id="email2"
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password2">
                  Password
                </Label>

                <Input
                  id="password2"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={busy}
              >
                {busy
                  ? "Creating account..."
                  : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}

