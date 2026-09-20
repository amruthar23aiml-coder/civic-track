import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ReportCategory = Database["public"]["Enums"]["report_category"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];

export type DetectionResult = {
  category: ReportCategory;
  confidence: number;
  source: "model";
};

export type PossibleMatch = {
  id: string;
  category: ReportCategory;
  description: string;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  before_image_url: string | null;
  status: ReportStatus;
  created_at: string;
  distanceMeters: number | null;
};

type CandidateReport = Omit<PossibleMatch, "distanceMeters">;

const publicStatuses: ReportStatus[] = ["verified", "assigned", "in_progress", "completed"];

function distanceInMeters(
  latitude: number,
  longitude: number,
  otherLatitude: number,
  otherLongitude: number,
) {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(otherLatitude - latitude);
  const longitudeDelta = toRadians(otherLongitude - longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(otherLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textSimilarity(left: string, right: string) {
  const leftWords = new Set(
    left
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2),
  );
  const rightWords = new Set(
    right
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2),
  );

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  const sharedWords = [...leftWords].filter((word) => rightWords.has(word)).length;
  return sharedWords / new Set([...leftWords, ...rightWords]).size;
}

/**
 * The model integration is deliberately server-side. Set
 * VITE_ISSUE_DETECTION_ENDPOINT to an authenticated application endpoint
 * that returns { category, confidence }; otherwise the caller gets a safe
 * manual-review result instead of a fabricated prediction.
 */
export async function detectIssueCategory(photo: File): Promise<DetectionResult | null> {
  const endpoint = import.meta.env["VITE_ISSUE_DETECTION_ENDPOINT"];
  if (!endpoint) {
    return null;
  }

  const formData = new FormData();
  formData.append("image", photo);
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Issue detection failed with status ${response.status}.`);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("category" in result) ||
    !("confidence" in result) ||
    typeof result.category !== "string" ||
    typeof result.confidence !== "number"
  ) {
    throw new Error("Issue detection returned an invalid result.");
  }

  const categories: readonly string[] = [
    "streetlight",
    "pothole",
    "garbage",
    "drainage",
    "traffic",
    "infrastructure",
    "illegal_dumping",
    "other",
  ];
  if (!categories.includes(result.category)) {
    throw new Error("Issue detection returned an unknown category.");
  }

  return {
    category: result.category as ReportCategory,
    confidence: Math.max(0, Math.min(1, result.confidence)),
    source: "model",
  };
}

export async function findPossibleMatches(input: {
  category: ReportCategory;
  description: string;
  latitude: number;
  longitude: number;
}): Promise<PossibleMatch[]> {
  const radiusDegrees = 0.03;
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, category, description, location_name, address, latitude, longitude, before_image_url, status, created_at",
    )
    .in("status", publicStatuses)
    .eq("category", input.category)
    .gte("latitude", input.latitude - radiusDegrees)
    .lte("latitude", input.latitude + radiusDegrees)
    .gte("longitude", input.longitude - radiusDegrees)
    .lte("longitude", input.longitude + radiusDegrees)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return ((data ?? []) as CandidateReport[])
    .map((report) => {
      const distanceMeters =
        report.latitude !== null && report.longitude !== null
          ? distanceInMeters(input.latitude, input.longitude, report.latitude, report.longitude)
          : null;
      const nearby = distanceMeters === null || distanceMeters <= 5000;
      const similarText = textSimilarity(input.description, report.description) >= 0.15;

      return {
        ...report,
        distanceMeters,
        isCandidate: nearby && (similarText || (distanceMeters ?? 0) <= 250),
      };
    })
    .filter((report) => report.isCandidate)
    .sort(
      (left, right) =>
        (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (right.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 5)
    .map(({ isCandidate: _isCandidate, ...report }) => report);
}

export function reportImageUrl(path: string | null) {
  if (!path) {
    return null;
  }

  return `${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/public/report-photos/${path}`;
}
