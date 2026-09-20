import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
import type DialogueStatsPlugin from "./main";
import { DEFAULT_SETTINGS, DialogueStatsSettings } from "./settings";
import { pickBand, pickColor } from "./core/bands";

type Key = keyof DialogueStatsSettings;

/**
 * Declarative settings tab (Obsidian 1.13+). Settings show up in Obsidian's
 * settings search. The live preview row uses a custom render.
 */
export class DialogueStatsSettingTab extends PluginSettingTab {
  private previewWords: HTMLElement | undefined;
  private previewDialogue: HTMLElement | undefined;
  private bandHint: HTMLElement | undefined;

  constructor(app: App, private readonly plugin: DialogueStatsPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<Key>[] {
    return [
      {
        type: "group",
        heading: "Current note",
        items: [
          {
            name: "Status bar preview",
            desc: "Live numbers for the note you have open.",
            searchable: false,
            render: (setting: Setting) => {
              const preview = setting.controlEl.createDiv({ cls: "dialogue-stats-preview" });
              this.previewWords = preview.createSpan();
              preview.createSpan({ cls: "dialogue-stats__sep", text: "|" });
              this.previewDialogue = preview.createSpan({ cls: "dialogue-stats__dialogue" });
              this.updatePreview();
              return () => {
                this.previewWords = undefined;
                this.previewDialogue = undefined;
              };
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Thresholds",
        items: [
          {
            name: "Low · below",
            desc: "Dialogue percentages below this value use the low color.",
            control: { type: "slider", key: "lowThreshold", min: 0, max: 100, step: 1, displayFormat: pct },
          },
          {
            name: "High · above",
            desc: "Dialogue percentages above this value use the high color.",
            control: { type: "slider", key: "highThreshold", min: 0, max: 100, step: 1, displayFormat: pct },
          },
          {
            name: "Target band",
            searchable: false,
            render: (setting: Setting) => {
              this.bandHint = setting.descEl;
              this.updateBandHint();
              return () => {
                this.bandHint = undefined;
              };
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Colors",
        items: [
          { name: "Low", desc: "Used below the low threshold.", control: { type: "color", key: "lowColor" } },
          { name: "Target", desc: "Used between the two thresholds.", control: { type: "color", key: "targetColor" } },
          { name: "High", desc: "Used above the high threshold.", control: { type: "color", key: "highColor" } },
        ],
      },
      {
        type: "group",
        heading: "Display",
        items: [
          {
            name: "Show in status bar",
            desc: "Desktop only. On mobile, use the show stats command instead.",
            control: { type: "toggle", key: "enabled" },
          },
          {
            name: "Update delay",
            desc: "Milliseconds to wait after typing stops before recounting.",
            control: { type: "slider", key: "updateDebounceMs", min: 0, max: 2000, step: 50, displayFormat: ms },
          },
          {
            name: "Reset to defaults",
            desc: "Thresholds 15 / 40. Blue, green, amber.",
            action: () => void this.reset(),
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    return this.plugin.settings[key as Key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const s = this.plugin.settings;
    switch (key as Key) {
      case "lowThreshold":
        s.lowThreshold = Math.min(Number(value), s.highThreshold);
        break;
      case "highThreshold":
        s.highThreshold = Math.max(Number(value), s.lowThreshold);
        break;
      case "updateDebounceMs":
        s.updateDebounceMs = Number(value);
        break;
      case "enabled":
        s.enabled = Boolean(value);
        break;
      case "lowColor":
      case "targetColor":
      case "highColor":
        s[key as "lowColor" | "targetColor" | "highColor"] = String(value);
        break;
    }
    await this.plugin.saveSettings();
    this.update();
    this.updatePreview();
  }

  private async reset(): Promise<void> {
    this.plugin.settings = { ...DEFAULT_SETTINGS };
    await this.plugin.saveSettings();
    this.update();
    this.updatePreview();
  }

  private updateBandHint(): void {
    const s = this.plugin.settings;
    this.bandHint?.setText(`${s.lowThreshold}% – ${s.highThreshold}%`);
  }

  /** Called by the plugin after every recount while the tab is open. */
  updatePreview(): void {
    this.updateBandHint();
    if (!this.previewWords || !this.previewDialogue) {
      return;
    }
    const stats = this.plugin.lastStats;
    if (!stats) {
      this.previewWords.setText("Words: —");
      this.previewDialogue.setText("Dialogue: —");
      this.previewDialogue.setCssProps({ "--dialogue-stats-color": "inherit" });
      return;
    }
    const band = pickBand(stats.dialoguePercent, this.plugin.settings);
    this.previewWords.setText(`Words: ${stats.totalWords.toLocaleString()}`);
    this.previewDialogue.setText(`Dialogue: ${stats.dialoguePercent}% (${band})`);
    this.previewDialogue.setCssProps({ "--dialogue-stats-color": pickColor(band, this.plugin.settings) });
  }
}

function pct(v: number): string {
  return `${v}%`;
}

function ms(v: number): string {
  return `${v} ms`;
}
