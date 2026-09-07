import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  HeartHandshake,
  Leaf,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Trophy,
  Users,
  FileText,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon };

const PUBLIC_NAV: NavItem[] = [
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/donate", label: "Donate", icon: HeartHandshake },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const VOLUNTEER_NAV: NavItem[] = [
  { to: "/dashboard", label: "My activity", icon: BarChart3 },
  { to: "/report", label: "Report an issue", icon: FileText },
  { to: "/my-reports", label: "My reports", icon: FileText },
  { to: "/events", label: "Browse events", icon: CalendarDays },
  { to: "/donate", label: "Donate", icon: HeartHandshake },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const AUTHORITY_NAV: NavItem[] = [
  { to: "/authority", label: "Reports", icon: ShieldCheck },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: ShieldCheck },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/volunteers", label: "Volunteers", icon: Users },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export type LayoutRole = "public" | "volunteer" | "admin" | "authority";

export function SiteLayout({ children, role }: { children: React.ReactNode; role?: LayoutRole }) {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const resolved: LayoutRole =
  role ?? (isAdmin ? "admin" : user ? "volunteer" : "public");

  const isAdminShell = resolved === "admin";
  const isAuthorityShell = resolved === "authority";

  const nav = isAdminShell
    ? ADMIN_NAV
    : isAuthorityShell
      ? AUTHORITY_NAV
      : resolved === "volunteer"
        ? VOLUNTEER_NAV
        : PUBLIC_NAV;

  return (
    <div className={cn("flex min-h-screen flex-col", isAdminShell && "bg-secondary/50")}>
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur",
          isAdminShell
            ? "hero-gradient border-transparent text-forest-foreground"
            : "border-border/70 bg-background/85",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
          <Link to={isAdminShell ? "/admin" : "/"} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-xl",
                isAdminShell ? "bg-background/15" : "leaf-gradient text-primary-foreground",
              )}
            >
              {isAdminShell ? <ShieldCheck className="size-5" /> : <Leaf className="size-5" />}
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              CivicTrack
              {isAdminShell && <span className="ml-2 text-xs font-medium uppercase opacity-80">Admin</span>}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isAdminShell
                    ? "opacity-80 hover:bg-background/15 hover:opacity-100"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                activeProps={{
                  className: isAdminShell ? "bg-background/20 opacity-100" : "bg-secondary text-foreground",
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && !isAdminShell && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            {isAdminShell && (
              <Button asChild variant="ghost" size="sm" className="hover:bg-background/15">
                <Link to="/">Public site</Link>
              </Button>
            )}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn(isAdminShell && "hover:bg-background/15")}
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Join as volunteer</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn("md:hidden", isAdminShell && "hover:bg-background/15")}
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
        <div className={cn("border-t md:hidden", open ? "block" : "hidden")}>
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
      <footer className={cn("border-t border-border", isAdminShell ? "bg-card" : "bg-secondary/40")}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-foreground">CareCircle — volunteers, NGOs and community organisers</p>
          <p>Organise. Volunteer. Measure the impact.</p>
        </div>
      </footer>
    </div>
  );
}
