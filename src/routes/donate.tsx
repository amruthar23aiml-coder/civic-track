import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { HeartHandshake, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { SiteLayout } from "@/components/SiteLayout";
import { UpcomingEventsBanner } from "@/components/SideBanners";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { donationsQuery, eventsQuery } from "@/lib/data";

const GOAL = 250000;
const PRESETS = [500, 1000, 2500, 5000];

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate — support our community initiatives | CareCircle" },
      {
        name: "description",
        content: "Fund meals, saplings, books, blankets and relief kits. Track our fundraising progress and donate.",
      },
      { property: "og:title", content: "Donate — support our community initiatives | CareCircle" },
      { property: "og:description", content: "Your contribution powers charity drives run by local volunteers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DonatePage,
});

function DonatePage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const donations = useQuery(donationsQuery());
  const campaigns = useQuery(eventsQuery("upcoming"));

  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [eventId, setEventId] = useState("general");

  const raised = (donations.data ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const pct = Math.min(100, Math.round((raised / GOAL) * 100));
  const fundraisers = (campaigns.data ?? []).filter((e) => e.category === "fundraising_campaign");

  const give = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("donations").insert({
        donor_id: user!.id,
        donor_name: anonymous ? "Anonymous" : profile?.full_name || "Supporter",
        amount: Math.max(1, Math.min(1000000, Number(amount || 0))),
        message: message.trim() ? message.trim().slice(0, 300) : null,
        is_anonymous: anonymous,
        event_id: eventId === "general" ? null : eventId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you — your donation has been recorded!");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["donations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <div className="hero-soft">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <HeartHandshake className="size-3.5" /> Community fund
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold">Support our community initiatives</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Donations pay for gloves and bags, saplings, cooked meals, school kits, blankets and emergency relief
            supplies distributed by volunteers in your city.
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section className="surface-card p-6">
            <h2 className="text-lg font-semibold">Fundraising progress</h2>
            <Progress value={pct} className="mt-4 h-2.5" />
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="text-base font-semibold text-foreground">₹{raised.toLocaleString("en-IN")}</span> raised
              of ₹{GOAL.toLocaleString("en-IN")} · {donations.data?.length ?? 0} supporters
            </p>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-lg font-semibold">Make a donation</h2>
            {!user ? (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Sign in so we can send you a receipt and updates.</p>
                <Button asChild className="mt-4">
                  <Link to="/auth">Sign in to donate</Link>
                </Button>
              </div>
            ) : (
              <form
                className="mt-4 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  give.mutate();
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={Number(amount) === p ? "default" : "outline"}
                      onClick={() => setAmount(String(p))}
                    >
                      ₹{p.toLocaleString("en-IN")}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    max="1000000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Direct my donation to</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General community fund</SelectItem>
                      {fundraisers.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg">Message (optional)</Label>
                  <Textarea
                    id="msg"
                    rows={3}
                    maxLength={300}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="anon" checked={anonymous} onCheckedChange={setAnonymous} />
                  <Label htmlFor="anon">Donate anonymously</Label>
                </div>
                <Button type="submit" className="w-full" disabled={give.isPending}>
                  {give.isPending ? <Loader2 className="size-4 animate-spin" /> : "Donate now"}
                </Button>
              </form>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Recent supporters</h2>
            <div className="surface-card mt-3 divide-y divide-border">
              {donations.isLoading && (
                <div className="flex items-center justify-center p-10">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
              {!donations.isLoading && (donations.data ?? []).length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Be the first to support this fund.</p>
              )}
              {(donations.data ?? []).slice(0, 12).map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-4 p-4 text-sm">
                  <div>
                    <p className="font-medium">{d.is_anonymous ? "Anonymous" : d.donor_name}</p>
                    {d.message && <p className="text-muted-foreground">{d.message}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(d.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">₹{Number(d.amount).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <UpcomingEventsBanner limit={5} className="h-fit" />
      </div>
    </SiteLayout>
  );
}
