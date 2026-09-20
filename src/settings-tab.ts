import { App, PluginSettingTab, Setting } from "obsidian";
import type DialogueStatsPlugin from "./main";
import { DEFAULT_SETTINGS, DialogueStatsSettings } from "./settings";
import { pickBand, pickColor } from "./core/bands";

type ColorKey = "lowColor" | "targetColor" | "highColor";

export class DialogueStatsSettingTab extends PluginSettingTab {
  private previewDialogue: HTMLElement | undefined;
  private previewWords: HTMLElement | undefined;
  private bandHint: HTMLElement | undefined;

  constructor(app: App, private readonly plugin: DialogueStatsPlugin) {
    super(app, plugin);
  }

  // The declarative settings API (1.13+) cannot host the live preview block, so display() stays.
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // --- Current file + preview
    new Setting(containerEl).setName("Current note").setHeading();
    const previewWrap = containerEl.createDiv({ cls: "dialogue-stats-preview-wrap" });
    const preview = previewWrap.createDiv({ cls: "dialogue-stats-preview" });
    this.previewWords = preview.createSpan();
    preview.createSpan({ cls: "dialogue-stats__sep", text: "|" });
    this.previewDialogue = preview.createSpan({ cls: "dialogue-stats__dialogue" });
    this.updatePreview();

    // --- Thresholds
    new Setting(containerEl).setName("Thresholds").setHeading();

    new Setting(containerEl)
      .setName("Low · below")
      .setDesc("Dialogue percentages below this value use the low color.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 100, 1)
          .setValue(this.plugin.settings.lowThreshold)
          .onChange(async (value) => {
            const high = this.plugin.settings.highThreshold;
            this.plugin.settings.lowThreshold = Math.min(value, high);
            if (value > high) {
              slider.setValue(high);
            }
            await this.plugin.saveSettings();
            this.updatePreview();
          })
      );

    new Setting(containerEl)
      .setName("High · above")
      .setDesc("Dialogue percentages above this value use the high color.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 100, 1)
          .setValue(this.plugin.settings.highThreshold)
          .onChange(async (value) => {
            const low = this.plugin.settings.lowThreshold;
            this.plugin.settings.highThreshold = Math.max(value, low);
            if (value < low) {
              slider.setValue(low);
            }
            await this.plugin.saveSettings();
            this.updatePreview();
          })
      );

    this.bandHint = containerEl.createDiv({ cls: "setting-item-description dialogue-stats-hint" });
    this.updateBandHint();

    // --- Colors
    new Setting(containerEl).setName("Colors").setHeading();
    this.addColor(containerEl, "Low", "Used below the low threshold.", "lowColor");
    this.addColor(containerEl, "Target", "Used between the two thresholds.", "targetColor");
    this.addColor(containerEl, "High", "Used above the high threshold.", "highColor");

    // --- General
    new Setting(containerEl).setName("Display").setHeading();

    new Setting(containerEl)
      .setName("Show in status bar")
      .setDesc("Desktop only. On mobile, use the show stats command instead.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Update delay")
      .setDesc("Milliseconds to wait after typing stops before recounting.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 2000, 50)
          .setValue(this.plugin.settings.updateDebounceMs)
          .onChange(async (value) => {
            this.plugin.settings.updateDebounceMs = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reset to defaults")
      .setDesc("Thresholds 15 / 40. Blue, green, amber.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings = { ...DEFAULT_SETTINGS };
          await this.plugin.saveSettings();
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          this.display();
        })
      );
  }

  private addColor(containerEl: HTMLElement, name: string, desc: string, key: ColorKey): void {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addColorPicker((picker) =>
        picker.setValue(this.plugin.settings[key]).onChange(async (value) => {
          this.plugin.settings[key] = value;
          await this.plugin.saveSettings();
          this.updatePreview();
        })
      );
  }

  private updateBandHint(): void {
    const s: DialogueStatsSettings = this.plugin.settings;
    this.bandHint?.setText(`Target band: ${s.lowThreshold}% – ${s.highThreshold}%`);
  }

  /** Called by the plugin after every recount while the tab is open. */
  updatePreview(): void {
    if (!this.previewWords || !this.previewDialogue) {
      return;
    }
    this.updateBandHint();
    const stats = this.plugin.lastStats;
    if (!stats) {
      this.previewWords.setText("Words: —");
      this.previewDialogue.setText("Dialogue: —");
      this.previewDialogue.setCssProps({ "--dialogue-stats-color": "inherit" });
      return;
    }
    const band = pickBand(stats.dialoguePercent, this.plugin.settings);
    this.previewWords.setText(`Words: ${stats.totalWords.toLocaleString()}`);
    this.previewDialogue.setText(`Dialogue: ${stats.dialoguePercent}%  (${band})`);
    this.previewDialogue.setCssProps({ "--dialogue-stats-color": pickColor(band, this.plugin.settings) });
  }
}
