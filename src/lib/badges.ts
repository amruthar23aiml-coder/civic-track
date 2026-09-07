import { Award, Leaf, Recycle, Sprout, Trash2, Trophy } from "lucide-react";

export type Badge = {
  id: string;
  label: string;
  description: string;
  icon: typeof Leaf;
};

const EVENT_BADGES: { threshold: number; badge: Badge }[] = [
  { threshold: 1, badge: { id: "first-step", label: "First Step", description: "Attended your first clean-up", icon: Sprout } },
  { threshold: 5, badge: { id: "regular", label: "Regular", description: "Attended 5 clean-ups", icon: Leaf } },
  { threshold: 10, badge: { id: "champion", label: "Champion", description: "Attended 10 clean-ups", icon: Trophy } },
  { threshold: 25, badge: { id: "legend", label: "Legend", description: "Attended 25 clean-ups", icon: Award } },
];

const WASTE_BADGES: { threshold: number; badge: Badge }[] = [
  { threshold: 10, badge: { id: "ten-kg", label: "10 kg Club", description: "Collected 10 kg of waste", icon: Trash2 } },
  { threshold: 50, badge: { id: "fifty-kg", label: "50 kg Club", description: "Collected 50 kg of waste", icon: Recycle } },
  { threshold: 250, badge: { id: "quarter-tonne", label: "Quarter Tonne", description: "Collected 250 kg of waste", icon: Award } },
];

export function earnedBadges(eventsAttended: number, weightKg: number): Badge[] {
  return [
    ...EVENT_BADGES.filter((b) => eventsAttended >= b.threshold).map((b) => b.badge),
    ...WASTE_BADGES.filter((b) => weightKg >= b.threshold).map((b) => b.badge),
  ];
}

export function nextMilestone(eventsAttended: number, weightKg: number) {
  const nextEvent = EVENT_BADGES.find((b) => eventsAttended < b.threshold);
  const nextWaste = WASTE_BADGES.find((b) => weightKg < b.threshold);
  return { nextEvent, nextWaste };
}