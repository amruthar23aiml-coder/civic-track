import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Leaf, ShieldCheck, Users } from "lucide-react";

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

type SelectedRole = "citizen" | "authority";

export const Route = createFileRoute("/auth")({
   
  head: () => ({
    meta: [
      {
        title: "Sign in — CivicTrack",
      },
      {
        name: "description",
        content:
          "Sign in to CivicTrack as a citizen or authority.",
      },
      {
        property: "og:title",
        content: "Sign in — CivicTrack",
      },
      {
        property: "og:description",
        content:
          "Sign in to CivicTrack to report civic issues, join community initiatives, or manage civic reports.",
      },
    ],
  }),
  component: AuthPage,
});

async function getUserRoles(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("Could not load user roles:", error);
    return [];
  }

  return (data ?? []).map((item) => String(item.role));
}

function getSelectedRole(): SelectedRole {
  if (typeof window === "undefined") {
    return "citizen";
  }

  const params = new URLSearchParams(window.location.search);

  return params.get("role") === "authority"
    ? "authority"
    : "citizen";
}

function getReturnTo(): "/report" | "/" {
  if (typeof window === "undefined") {
    return "/";
  }

  const params = new URLSearchParams(window.location.search);

  return params.get("returnTo") === "/report"
    ? "/report"
    : "/";
}

function AuthPage() {
  const navigate = useNavigate();

  const { user, loading } = useAuth();

  const [selectedRole, setSelectedRole] =
    useState<SelectedRole>("citizen");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedRole(getSelectedRole());
  }, []);

  const isAuthority = selectedRole === "authority";

  async function goToDestination(
    userId: string,
    role: SelectedRole,
  ) {
    const roles = await getUserRoles(userId);

    if (role === "authority") {
      if (roles.includes("authority")) {
        navigate({
          to: "/authority",
        });
        return;
      }

      await supabase.auth.signOut();

      toast.error(
        "This account is not registered as an authority account.",
      );

      return;
    }

    if (roles.includes("authority")) {
      await supabase.auth.signOut();

      toast.error(
        "Please use the Authority sign-in option for this account.",
      );

      return;
    }

    if (roles.includes("admin")) {
      navigate({
        to: "/admin",
      });
      return;
    }

     sessionStorage.setItem(
  "civictrack-role-selected",
  "citizen",
);

navigate({
  to: getReturnTo(),
});
}

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    goToDestination(user.id, selectedRole);
  }, [loading, user, selectedRole]);

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

    const roles = await getUserRoles(data.user.id);

    if (selectedRole === "authority") {
      if (!roles.includes("authority")) {
        await supabase.auth.signOut();

        setBusy(false);

        toast.error(
          "This account is not registered as an authority account.",
        );

        return;
      }
    } else {
      if (roles.includes("authority")) {
        await supabase.auth.signOut();

        setBusy(false);

        toast.error(
          "Please use the Authority sign-in option for this account.",
        );

        return;
      }
    }

    toast.success("Signed in successfully.");

    await goToDestination(
      data.user.id,
      selectedRole,
    );

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
          window.location.origin +
          "/auth?role=citizen",
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
      "Account created — check your inbox if confirmation is required.",
    );
  }

  async function google() {
    setBusy(true);

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            window.location.origin +
            "/auth?role=citizen",
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
            {isAuthority ? (
              <ShieldCheck className="size-6" />
            ) : (
              <Users className="size-6" />
            )}
          </span>

          <h1 className="mt-4 text-3xl font-bold">
            {isAuthority
              ? "Authority Sign In"
              : "Welcome, Citizen"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {isAuthority
              ? "Sign in with your authorized CivicTrack authority account to manage civic reports."
              : "Sign in to report civic issues, join community initiatives, volunteer, and track your impact."}
          </p>
        </div>

        {!isAuthority && (
          <>
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
          </>
        )}

        <div className="surface-card p-5">
          {isAuthority ? (
            <form
              className="space-y-4"
              onSubmit={signIn}
            >
              <div className="space-y-2">
                <Label htmlFor="authority-email">
                  Authority Email
                </Label>

                <Input
                  id="authority-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter authority email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authority-password">
                  Password
                </Label>

                <Input
                  id="authority-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={busy}
              >
                {busy
                  ? "Signing in..."
                  : "Authority Sign In"}
              </Button>
            </form>
          ) : (
            <Tabs
              defaultValue="signin"
              className="w-full"
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
                      placeholder="Enter your email"
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
                      placeholder="Enter your password"
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
                      placeholder="Enter your full name"
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
                      placeholder="Enter your email"
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
                      placeholder="Create a password"
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
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          {isAuthority ? (
            <>
              <ShieldCheck className="size-4 text-primary" />
              Authorized CivicTrack personnel only
            </>
          ) : (
            <>
              <Leaf className="size-4 text-primary" />
              Make your community better, one action at a time.
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
