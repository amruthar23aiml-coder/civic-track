import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/SiteLayout";
import heroImage from "@/assets/hero-cleanup.jpg";

export const Route = createFileRoute("/choose-role")({
  head: () => ({
    meta: [
      {
        title: "Choose Your Role — CivicTrack",
      },
      {
        name: "description",
        content:
          "Choose whether you are a citizen or authority to continue to CivicTrack.",
      },
      {
        property: "og:title",
        content: "Choose Your Role — CivicTrack",
      },
      {
        property: "og:description",
        content:
          "Choose whether you are a citizen or authority to continue to CivicTrack.",
      },
    ],
  }),
  component: ChooseRolePage,
});

function ChooseRolePage() {
  return (
    <SiteLayout>
      <main className="hero-soft border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Welcome to CivicTrack
            </p>

            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl">
              How would you like to continue?
            </h1>

            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              CivicTrack connects citizens and authorities to report civic
              issues, participate in community initiatives, and create
              cleaner, safer, and better neighbourhoods.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="surface-card flex flex-col p-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Users className="size-6 text-primary" />
                </div>

                <h2 className="mt-5 text-xl font-bold">
                  I&apos;m a Citizen
                </h2>

                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  Report civic problems, explore community initiatives,
                  volunteer, and track your contribution.
                </p>

                <Button
                  asChild
                  className="mt-6 w-full"
                >
                  <a href="/">
                    Continue as Citizen
                  </a>
                </Button>
              </div>

              <div className="surface-card flex flex-col p-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                  <ShieldCheck className="size-6 text-primary" />
                </div>

                <h2 className="mt-5 text-xl font-bold">
                  I&apos;m an Authority
                </h2>

                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  Sign in to manage civic reports, update their status, and
                  report completed cleanup actions.
                </p>

                <Button
                  asChild
                  variant="outline"
                  className="mt-6 w-full"
                >
                  <a href="/auth?role=authority">
                    Authority Sign In
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <img
            src={heroImage}
            alt="Volunteers working together to improve their community"
            width={1600}
            height={1000}
            className="w-full rounded-3xl border border-border object-cover shadow-lg"
          />
        </div>
      </main>
    </SiteLayout>
  );
}
