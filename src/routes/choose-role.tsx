import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Users } from "lucide-react";

import { SiteLayout } from "@/components/SiteLayout";

import plantationImage from "@/assets/plantation.jfif";
import cleanupImage from "@/assets/pexels-shvetsa-5029859.jpg";
import teachingImage from "@/assets/pexels-soumayan-biswas-2155059623-35552523.jpg";

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
      <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#080c0a] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#00d084]/10 blur-[120px]" />
          <div className="absolute right-[-120px] top-1/3 h-96 w-96 rounded-full bg-[#00a86b]/8 blur-[140px]" />
          <div className="absolute bottom-[-180px] left-1/3 h-96 w-96 rounded-full bg-emerald-500/5 blur-[130px]" />

          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center px-4 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
          <div className="grid w-full gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
            
            {/* LEFT SIDE */}
            <section className="max-w-2xl">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-[#00d084]/20 bg-[#00d084]/10">
                  <CheckCircle2 className="size-5 text-[#00d084]" />
                </div>

                <div>
                  <p className="text-sm font-bold tracking-[0.2em] text-[#00d084]">
                    CIVICTRACK
                  </p>

                  <p className="text-xs text-white/40">
                    Community action platform
                  </p>
                </div>
              </div>

              <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-white/45">
                Welcome to your civic space
              </p>

              <h1 className="max-w-xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                Your city.
                <br />
                <span className="text-[#00d084]">Your impact.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
                Report problems, discover community initiatives, volunteer,
                and help turn local issues into visible action.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/45">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#00d084]" />
                  Report civic issues
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#00d084]" />
                  Join initiatives
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#00d084]" />
                  Track real impact
                </div>
              </div>

              {/* IMAGE COLLAGE */}
          <div className="relative mt-10 h-[260px] sm:h-[320px] lg:h-[360px]">

            {/* Main cleanup image */}
            <button
              type="button"
              onClick={() => window.open(cleanupImage, "_blank")}
              className="group absolute inset-y-0 left-0 right-16 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl"
            >
              <img
                src={cleanupImage}
                alt="Community volunteers working together"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#080c0a]/90 via-[#080c0a]/10 to-transparent transition-colors duration-500 group-hover:from-[#080c0a]/95 group-hover:via-[#080c0a]/30" />

              <div className="absolute bottom-6 left-6 right-6 translate-y-2 text-left opacity-80 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="max-w-md text-base font-semibold leading-6 text-white">
                  Real change starts when someone chooses to act.
                </p>

                <p className="mt-2 text-xs text-white/45">
                  Community Cleanup
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#00d084]">
                  View activity
                  <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </button>

            {/* Plantation image */}
            <button
              type="button"
              onClick={() => window.open(plantationImage, "_blank")}
              className="group absolute right-0 top-5 h-40 w-40 overflow-hidden rounded-3xl border-4 border-[#080c0a] bg-[#080c0a] shadow-2xl"
            >
              <img
                src={plantationImage}
                alt="Volunteers improving a community space"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#080c0a]/90 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="absolute inset-x-3 bottom-3 text-left opacity-0 transition-all duration-500 group-hover:opacity-100">
                <p className="text-xs font-semibold leading-4 text-white">
                  Plant a little today. Grow a better tomorrow.
                </p>

                <p className="mt-1 text-[10px] text-[#00d084]">
                  Plantation Drive →
                </p>
              </div>
            </button>

            {/* Teaching / community image */}
            <button
              type="button"
              onClick={() => window.open(teachingImage, "_blank")}
              className="group absolute bottom-5 right-0 h-40 w-40 overflow-hidden rounded-3xl border-4 border-[#080c0a] bg-[#080c0a] shadow-2xl"
            >
              <img
                src={teachingImage}
                alt="Community education activity"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#080c0a]/90 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="absolute inset-x-3 bottom-3 text-left opacity-0 transition-all duration-500 group-hover:opacity-100">
                <p className="text-xs font-semibold leading-4 text-white">
                  When we come together, our community grows stronger.
                </p>

                <p className="mt-1 text-[10px] text-[#00d084]">
                  Community Outreach →
                </p>
              </div>
            </button>

          </div>
          </section>
            {/* RIGHT SIDE */}
            <section>
              <div className="mb-5">
                <p className="text-sm font-medium text-white/40">
                  Choose how you want to continue
                </p>
              </div>

              <div className="grid gap-4">
                
                {/* CITIZEN */}
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem(
                      "civictrack-role-selected",
                      "citizen",
                    );

                    window.location.href = "/?role=citizen";
                  }}
                  className="group relative overflow-hidden rounded-3xl border border-[#00d084]/20 bg-white/[0.045] p-6 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#00d084]/45 hover:bg-[#00d084]/[0.07] hover:shadow-[0_20px_70px_rgba(0,208,132,0.10)] sm:p-8"
                >
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#00d084]/10 blur-[70px] transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative flex items-start justify-between gap-5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#00d084]/20 bg-[#00d084]/10">
                      <Users className="size-7 text-[#00d084]" />
                    </div>

                    <ArrowRight className="mt-1 size-5 text-white/25 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#00d084]" />
                  </div>

                  <div className="relative mt-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00d084]">
                      For the community
                    </p>

                    <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                      I&apos;m a Citizen
                    </h2>

                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/50">
                      Report civic issues, explore local initiatives, join
                      activities, volunteer, and see the impact you make.
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors group-hover:text-[#00d084]">
                      Enter CivicTrack
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>

                {/* AUTHORITY */}
                <a
                  href="/auth?role=authority"
                  onClick={() => {
                    sessionStorage.setItem(
                      "civictrack-role-selected",
                      "authority",
                    );
                  }}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-8"
                >
                  <div className="relative flex items-start justify-between gap-5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                      <ShieldCheck className="size-7 text-white/75" />
                    </div>

                    <ArrowRight className="mt-1 size-5 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/70" />
                  </div>

                  <div className="relative mt-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                      For civic authorities
                    </p>

                    <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                      I&apos;m an Authority
                    </h2>

                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/45">
                      Manage civic reports, verify issues, coordinate
                      resolutions, update progress, and track outcomes.
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/55 transition-colors group-hover:text-white">
                      Authority Sign In
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </a>
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-white/25">
                CivicTrack connects community participation with measurable
                local action.
              </p>
            </section>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}