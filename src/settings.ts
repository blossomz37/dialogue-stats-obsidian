export interface DialogueStatsSettings {
  enabled: boolean;
  updateDebounceMs: number;
  lowThreshold: number;
  highThreshold: number;
  lowColor: string;
  targetColor: string;
  highColor: string;
}

/** Same defaults as the VS Code extension. */
export const DEFAULT_SETTINGS: DialogueStatsSettings = {
  enabled: true,
  updateDebounceMs: 200,
  lowThreshold: 15,
  highThreshold: 40,
  lowColor: "#6FA8DC",
  targetColor: "#73C991",
  highColor: "#E5A84B",
};
