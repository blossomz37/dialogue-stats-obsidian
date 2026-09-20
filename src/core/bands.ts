/**
 * Pure band logic. PORTABLE. No platform imports. See docs/SPEC.md §7.
 */

export type Band = "low" | "target" | "high";

export interface Thresholds {
  lowThreshold: number;
  highThreshold: number;
}

/** If low > high, swap them. Never throw. */
export function normalizeThresholds(t: Thresholds): Thresholds {
  const low = Math.min(t.lowThreshold, t.highThreshold);
  const high = Math.max(t.lowThreshold, t.highThreshold);
  return { lowThreshold: low, highThreshold: high };
}

/** pct < low → low. pct > high → high. Otherwise target. */
export function pickBand(percent: number, thresholds: Thresholds): Band {
  const { lowThreshold, highThreshold } = normalizeThresholds(thresholds);
  if (percent < lowThreshold) {
    return "low";
  }
  if (percent > highThreshold) {
    return "high";
  }
  return "target";
}

export interface BandColors {
  lowColor: string;
  targetColor: string;
  highColor: string;
}

export function pickColor(band: Band, colors: BandColors): string {
  switch (band) {
    case "low":
      return colors.lowColor;
    case "high":
      return colors.highColor;
    default:
      return colors.targetColor;
  }
}
