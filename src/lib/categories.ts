import {
  Baby,
  Bike,
  BookOpen,
  Brush,
  Coins,
  Dog,
  Droplet,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Leaf,
  LifeBuoy,
  Pill,
  Recycle,
  School,
  Shirt,
  Sparkles,
  Stethoscope,
  ToyBrick,
  TreeDeciduous,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export type EventCategory = Database["public"]["Enums"]["event_category"];

export const CATEGORY_GROUPS = ["Donation", "Health & Relief", "Environment", "Education & Community"] as const;
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export type FieldType = "text" | "number" | "textarea" | "date" | "select";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
};

export type CategoryDef = {
  value: EventCategory;
  label: string;
  group: CategoryGroup;
  icon: LucideIcon;
  /** Tailwind classes built from semantic tokens. */
  tone: string;
  fields: FieldDef[];
};

const DONATION_DRIVE_FIELDS: FieldDef[] = [
  { key: "items_needed", label: "Accepted donation items", type: "textarea", placeholder: "What can people donate?" },
  { key: "drop_off_point", label: "Collection / drop-off point", type: "text" },
  { key: "deadline", label: "Collection deadline", type: "date" },
  { key: "beneficiary", label: "Beneficiary organisation", type: "text" },
];

const WORKSHOP_FIELDS: FieldDef[] = [
  { key: "topics", label: "Topics covered", type: "textarea" },
  { key: "trainer", label: "Trainer / facilitator", type: "text" },
  { key: "seats", label: "Seats available", type: "number" },
  { key: "mode", label: "Mode", type: "select", options: ["Offline", "Online", "Hybrid"] },
];

const AWARENESS_FIELDS: FieldDef[] = [
  { key: "focus", label: "Campaign focus", type: "textarea" },
  { key: "collection_point", label: "Collection point", type: "text" },
  { key: "target_quantity", label: "Target quantity (kg / units)", type: "number" },
];

const VISIT_FIELDS: FieldDef[] = [
  { key: "facility_name", label: "Facility / shelter name", type: "text" },
  { key: "activities", label: "Planned activities", type: "textarea" },
  { key: "items_needed", label: "Items to bring", type: "textarea" },
];

const MEDICAL_FIELDS: FieldDef[] = [
  { key: "partner", label: "Hospital / blood bank partner", type: "text" },
  { key: "eligibility", label: "Donor / patient eligibility", type: "textarea" },
  { key: "slots", label: "Available slots", type: "number" },
  { key: "emergency_contact", label: "Emergency contact", type: "text" },
];

export const CATEGORIES: CategoryDef[] = [
  {
    value: "community_cleanup",
    label: "Community Clean-Up",
    group: "Environment",
    icon: Brush,
    tone: "bg-primary/10 text-primary border-primary/25",
    fields: [
      { key: "area_name", label: "Area name", type: "text", placeholder: "Riverside Park, north bank" },
      { key: "waste_type", label: "Waste type", type: "select", options: ["Plastic", "Mixed", "E-waste", "Glass & metal", "Organic"] },
      { key: "supplies", label: "Gloves / bags required", type: "text", placeholder: "50 gloves, 30 bags" },
      { key: "duration_hours", label: "Expected duration (hours)", type: "number" },
    ],
  },
  {
    value: "tree_plantation",
    label: "Tree Plantation",
    group: "Environment",
    icon: TreeDeciduous,
    tone: "bg-primary/10 text-primary border-primary/25",
    fields: [
      { key: "saplings", label: "Number of saplings", type: "number" },
      { key: "species", label: "Plant species", type: "text" },
      { key: "maintenance_volunteers", label: "Watering / maintenance volunteers needed", type: "number" },
      { key: "zone", label: "Plantation zone", type: "text" },
    ],
  },
  {
    value: "environmental_awareness",
    label: "Environmental Awareness Campaign",
    group: "Environment",
    icon: Leaf,
    tone: "bg-primary/10 text-primary border-primary/25",
    fields: AWARENESS_FIELDS,
  },
  {
    value: "recycling_ewaste",
    label: "Recycling & E-Waste Collection",
    group: "Environment",
    icon: Recycle,
    tone: "bg-primary/10 text-primary border-primary/25",
    fields: AWARENESS_FIELDS,
  },
  {
    value: "food_donation",
    label: "Food Donation",
    group: "Donation",
    icon: UtensilsCrossed,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: [
      { key: "meals_needed", label: "Number of meals needed", type: "number" },
      { key: "distribution_location", label: "Distribution location", type: "text" },
      { key: "kitchen_volunteers", label: "Cooking / packing volunteers required", type: "number" },
      { key: "sponsor", label: "Food sponsor information", type: "textarea" },
    ],
  },
  {
    value: "clothes_donation",
    label: "Clothes Donation",
    group: "Donation",
    icon: Shirt,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "book_donation",
    label: "Book Donation",
    group: "Donation",
    icon: BookOpen,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "school_supplies_donation",
    label: "School Supplies Donation",
    group: "Donation",
    icon: School,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "toy_donation",
    label: "Toy Donation Drive",
    group: "Donation",
    icon: ToyBrick,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "blanket_donation",
    label: "Blanket Donation Drive",
    group: "Donation",
    icon: HandHeart,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "fundraising_campaign",
    label: "Money / Fundraising Campaign",
    group: "Donation",
    icon: Coins,
    tone: "bg-sun/25 text-sun-foreground border-sun/50",
    fields: [
      { key: "target_amount", label: "Target amount", type: "number" },
      { key: "accepted_items", label: "Accepted donation items", type: "textarea" },
      { key: "deadline", label: "Collection deadline", type: "date" },
      { key: "beneficiary", label: "Beneficiary organisation details", type: "textarea" },
    ],
  },
  {
    value: "blood_donation_camp",
    label: "Blood Donation Camp",
    group: "Health & Relief",
    icon: Droplet,
    tone: "bg-destructive/10 text-destructive border-destructive/25",
    fields: MEDICAL_FIELDS,
  },
  {
    value: "medical_checkup_camp",
    label: "Medical Check-Up Camp",
    group: "Health & Relief",
    icon: Stethoscope,
    tone: "bg-destructive/10 text-destructive border-destructive/25",
    fields: MEDICAL_FIELDS,
  },
  {
    value: "medicine_donation",
    label: "Medicine Donation Drive",
    group: "Health & Relief",
    icon: Pill,
    tone: "bg-destructive/10 text-destructive border-destructive/25",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "disaster_relief",
    label: "Disaster Relief Collection",
    group: "Health & Relief",
    icon: LifeBuoy,
    tone: "bg-destructive/10 text-destructive border-destructive/25",
    fields: DONATION_DRIVE_FIELDS,
  },
  {
    value: "charity_marathon",
    label: "Charity Marathon / Walkathon",
    group: "Health & Relief",
    icon: Bike,
    tone: "bg-destructive/10 text-destructive border-destructive/25",
    fields: [
      { key: "distance_km", label: "Distance (km)", type: "number" },
      { key: "route", label: "Route", type: "textarea" },
      { key: "registration_fee", label: "Registration fee", type: "number" },
      { key: "target_amount", label: "Fundraising target", type: "number" },
    ],
  },
  {
    value: "educational_tutoring",
    label: "Educational Tutoring Program",
    group: "Education & Community",
    icon: GraduationCap,
    tone: "bg-accent/40 text-accent-foreground border-accent",
    fields: [
      { key: "subjects", label: "Subjects taught", type: "text" },
      { key: "age_group", label: "Student age group", type: "text" },
      { key: "materials", label: "Teaching materials required", type: "textarea" },
      { key: "mode", label: "Mode", type: "select", options: ["Offline", "Online", "Hybrid"] },
    ],
  },
  {
    value: "women_empowerment",
    label: "Women Empowerment Workshop",
    group: "Education & Community",
    icon: Sparkles,
    tone: "bg-accent/40 text-accent-foreground border-accent",
    fields: WORKSHOP_FIELDS,
  },
  {
    value: "skill_development",
    label: "Skill Development Training",
    group: "Education & Community",
    icon: Users,
    tone: "bg-accent/40 text-accent-foreground border-accent",
    fields: WORKSHOP_FIELDS,
  },
  {
    value: "old_age_home_visit",
    label: "Old Age Home Visit",
    group: "Education & Community",
    icon: HeartPulse,
    tone: "bg-accent/40 text-accent-foreground border-accent",
    fields: VISIT_FIELDS,
  },
  {
    value: "animal_shelter_support",
    label: "Animal Shelter Support",
    group: "Education & Community",
    icon: Dog,
    tone: "bg-accent/40 text-accent-foreground border-accent",
    fields: VISIT_FIELDS,
  },
  {
    value: "other",
    label: "Other (Custom Event Type)",
    group: "Education & Community",
    icon: Baby,
    tone: "bg-secondary text-secondary-foreground border-border",
    fields: [
      { key: "custom_details", label: "What should volunteers know?", type: "textarea" },
      { key: "items_needed", label: "Items / supplies needed", type: "text" },
    ],
  },
];

export const CATEGORY_MAP: Record<EventCategory, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c]),
) as Record<EventCategory, CategoryDef>;

export function categoryLabel(value: EventCategory, custom?: string | null) {
  if (value === "other" && custom?.trim()) return custom.trim();
  return CATEGORY_MAP[value]?.label ?? "Charity event";
}

export function categoriesByGroup(group: CategoryGroup) {
  return CATEGORIES.filter((c) => c.group === group);
}
