import { plantCatalogData } from "./catalogData";
import type { PlantCatalogItem } from "./types";

// Slug helpers ported from Weedoshi so slugs round-trip identically.
export function getPlantBySlug(slug: string): PlantCatalogItem | undefined {
  return plantCatalogData.items.find((item) => item.id === slug);
}

export function isCustomPlantSlug(slug: string | undefined | null): boolean {
  return Boolean(slug && slug.startsWith("custom:"));
}

export function decodeCustomPlantSlug(slug: string): string | null {
  if (!slug.startsWith("custom:")) return null;
  const encoded = slug.slice("custom:".length);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export function plantDisplayName(slug: string | undefined, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback.trim();
  if (!slug) return "Unknown plant";
  const custom = decodeCustomPlantSlug(slug);
  if (custom) return custom;
  return getPlantBySlug(slug)?.latin ?? slug;
}
