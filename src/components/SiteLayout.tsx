import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarPlus,
  HeartHandshake,
  Leaf,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Sun,
  Trophy,
  Users,
  FileText,
  Moon,
  Monitor,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";

type NavItem = { to: string; label: string; icon: LucideIcon };

const PUBLIC_NAV: NavItem[] = [
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/donate", label: "Donate", icon: HeartHandshake },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const VOLUNTEER_NAV: NavItem[] = [
  { to: "/dashboard", label: "My Activity", icon: BarChart3 },
  { to: "/report", label: "Report Issue", icon: FileText },
  { to: "/my-reports", label: "My Reports", icon: FileText },
  { to: "/reports", label: "Community", icon: FileText },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/donate", label: "Donate", icon: HeartHandshake },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const ORGANIZER_NAV: NavItem[] = [
  { to: "/dashboard", label: "My Activity", icon: BarChart3 },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/donate", label: "Donate", icon: HeartHandshake },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const AUTHORITY_NAV: NavItem[] = [{ to: "/authority", label: "Reports", icon: ShieldCheck }];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: ShieldCheck },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/volunteers", label: "Volunteers", icon: Users },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export type LayoutRole = "public" | "volunteer" | "organizer" | "admin" | "authority";

export function SiteLayout({ children, role }: { children: React.ReactNode; role?: LayoutRole }) {
  const { user, isAdmin, isOrganizer, isAuthority } = useAuth();
  const [open, setOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const { mode, setMode } = useTheme();

  const resolved: LayoutRole =
    role ??
    (isAdmin
      ? "admin"
      : isAuthority
        ? "authority"
        : isOrganizer
          ? "organizer"
          : user
            ? "volunteer"
            : "public");

  const isAdminShell = resolved === "admin";
  const isAuthorityShell = resolved === "authority";

  const nav = isAdminShell
    ? ADMIN_NAV
    : isAuthorityShell
      ? AUTHORITY_NAV
      : resolved === "organizer"
        ? ORGANIZER_NAV
        : resolved === "volunteer"
          ? VOLUNTEER_NAV
          : PUBLIC_NAV;

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col overflow-x-hidden",
        isAdminShell && "bg-secondary/50",
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur",
          isAdminShell
            ? "hero-gradient border-transparent text-forest-foreground"
            : "border-border/70 bg-background/85",
        )}
      >
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-5">
          <Link to={isAdminShell ? "/admin" : "/"} className="group flex items-center gap-2">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:rotate-[-6deg]",
                isAdminShell
                  ? "bg-background/15"
                  : "bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_var(--primary)]",
              )}
            >
              {isAdminShell ? <ShieldCheck className="size-5" /> : <Leaf className="size-5" />}
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              CivicTrack
              {isAdminShell && (
                <span className="ml-2 text-xs font-medium uppercase opacity-80">Admin</span>
              )}
            </span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:px-3",
                  isAdminShell
                    ? "opacity-80 hover:bg-background/15 hover:opacity-100"
                    : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                )}
                activeProps={{
                  className: isAdminShell
                    ? "bg-background/20 opacity-100"
                    : "bg-primary/10 text-foreground",
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {user && !isAdminShell && !isAuthorityShell && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                aria-label="Notifications"
                title="Notifications"
              >
                <Link to="/notifications">
                  <Bell className="size-4" />
                  <span className="hidden 2xl:inline">Notifications</span>
                </Link>
              </Button>
            )}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Change appearance"
                onClick={() => setAppearanceOpen((value) => !value)}
                className={cn(isAdminShell && "hover:bg-background/15")}
              >
                {mode === "light" ? (
                  <Sun className="size-4" />
                ) : mode === "dark" ? (
                  <Moon className="size-4" />
                ) : (
                  <Monitor className="size-4" />
                )}
                <span className="hidden sm:inline">Appearance</span>
              </Button>
              {appearanceOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                  {(["light", "dark", "system"] as ThemeMode[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMode(option);
                        setAppearanceOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm capitalize transition-colors",
                        mode === option
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isAdmin && !isAdminShell && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/35 hover:border-primary/70"
              >
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            {isAdminShell && (
              <Button asChild variant="ghost" size="sm" className="hover:bg-background/15">
                <Link to="/">Public site</Link>
              </Button>
            )}
            {user ? (
              <>
                {!isAdminShell && !isAuthorityShell && (
                  <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                    <Link to={isOrganizer ? "/events/new" : "/dashboard"}>
                      {isOrganizer ? "Create initiative" : "My activity"}
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(isAdminShell && "hover:bg-background/15")}
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="size-4" /> Sign out
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link
                  to="/auth"
                  search={{
                    role: "citizen",
                  }}
                >
                  Sign In
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn("xl:hidden", isAdminShell && "hover:bg-background/15")}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
        <div className={cn("border-t xl:hidden", open ? "block" : "hidden")}>
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 py-2 text-sm font-medium",
                  isAdminShell ? "opacity-85" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer
        className={cn("border-t border-border", isAdminShell ? "bg-card" : "bg-secondary/40")}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-foreground">
            CivicTrack — citizens, volunteers, authorities and communities
          </p>
        </div>
      </footer>
    </div>
  );
}
