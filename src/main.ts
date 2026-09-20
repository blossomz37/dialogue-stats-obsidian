import { MarkdownView, Notice, Plugin, TFile, debounce } from "obsidian";
import { analyze, DocumentStats } from "./core/stats";
import { pickBand } from "./core/bands";
import { normalizeThresholds } from "./core/bands";
import { DEFAULT_SETTINGS, DialogueStatsSettings } from "./settings";
import { DialogueStatsSettingTab } from "./settings-tab";
import { StatusBar } from "./status-bar";

export default class DialogueStatsPlugin extends Plugin {
  settings: DialogueStatsSettings = { ...DEFAULT_SETTINGS };
  lastStats: DocumentStats | undefined;

  private statusBar: StatusBar | undefined;
  private settingTab: DialogueStatsSettingTab | undefined;
  private refreshSoon: (() => void) | undefined;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Status bar items are desktop only. addStatusBarItem() is a no-op container on mobile.
    this.statusBar = new StatusBar(this.addStatusBarItem());

    this.settingTab = new DialogueStatsSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.addCommand({
      id: "show-stats",
      name: "Show stats for current note",
      callback: () => this.showNotice(),
    });
    this.addCommand({
      id: "toggle-status-bar",
      name: "Toggle status bar",
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
      },
    });
    this.addCommand({
      id: "refresh",
      name: "Refresh",
      callback: () => void this.refresh(),
    });

    this.buildDebounce();

    this.registerEvent(this.app.workspace.on("active-leaf-change", () => void this.refresh()));
    this.registerEvent(this.app.workspace.on("editor-change", () => this.refreshSoon?.()));
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file === this.app.workspace.getActiveFile()) {
          this.refreshSoon?.();
        }
      })
    );

    this.app.workspace.onLayoutReady(() => void this.refresh());
  }

  onunload(): void {
    // registerEvent handles cleanup. Status bar element is removed by Obsidian.
  }

  async loadSettings(): Promise<void> {
    const raw = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<DialogueStatsSettings>);
    this.settings = { ...raw, ...normalizeThresholds(raw) };
  }

  async saveSettings(): Promise<void> {
    this.settings = { ...this.settings, ...normalizeThresholds(this.settings) };
    await this.saveData(this.settings);
    this.buildDebounce();
    await this.refresh();
  }

  private buildDebounce(): void {
    this.refreshSoon = debounce(() => void this.refresh(), this.settings.updateDebounceMs, true);
  }

  /** Read the active note. Prefer the live editor text so unsaved edits count. */
  private async readActiveText(): Promise<string | undefined> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      return view.editor.getValue();
    }
    const file = this.app.workspace.getActiveFile();
    if (file instanceof TFile && file.extension === "md") {
      return this.app.vault.cachedRead(file);
    }
    return undefined;
  }

  async refresh(): Promise<void> {
    const text = await this.readActiveText();
    this.lastStats = text === undefined ? undefined : analyze(text);
    this.statusBar?.render(this.lastStats, this.settings);
    this.settingTab?.updatePreview();
  }

  private async showNotice(): Promise<void> {
    await this.refresh();
    const s = this.lastStats;
    if (!s) {
      new Notice("Open a markdown note first.");
      return;
    }
    const band = pickBand(s.dialoguePercent, this.settings);
    new Notice(
      `Words: ${s.totalWords.toLocaleString()}\n` +
        `Dialogue: ${s.dialoguePercent}% (${band})\n` +
        `Dialogue words: ${s.dialogueWords.toLocaleString()} · Prose: ${s.proseWords.toLocaleString()}\n` +
        `Blocks: ${s.dialogueBlocks} · avg ${s.avgBlockWords} words`,
      8000
    );
  }
}
