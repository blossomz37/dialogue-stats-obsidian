import { DocumentStats } from "./core/stats";
import { pickBand, pickColor } from "./core/bands";
import { DialogueStatsSettings } from "./settings";

/**
 * Three spans in one status bar element. Only the dialogue span takes the band color.
 * Obsidian hands us a real HTMLElement, so any CSS color works.
 */
export class StatusBar {
  private readonly wordsEl: HTMLElement;
  private readonly dialogueEl: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.addClass("dialogue-stats");
    this.wordsEl = root.createSpan({ cls: "dialogue-stats__words" });
    root.createSpan({ cls: "dialogue-stats__sep", text: "|" });
    this.dialogueEl = root.createSpan({ cls: "dialogue-stats__dialogue" });
  }

  render(stats: DocumentStats | undefined, settings: DialogueStatsSettings): void {
    if (!settings.enabled || !stats) {
      this.root.hide();
      return;
    }
    const band = pickBand(stats.dialoguePercent, settings);
    const color = pickColor(band, settings);

    this.wordsEl.setText(`Words: ${stats.totalWords.toLocaleString()}`);
    this.dialogueEl.setText(`Dialogue: ${stats.dialoguePercent}%`);
    this.dialogueEl.setCssProps({ "--dialogue-stats-color": color });
    this.root.setAttr(
      "aria-label",
      `${stats.totalWords} words. ${stats.dialogueWords} dialogue words. ` +
        `Dialogue ${stats.dialoguePercent} percent, ${band}. ` +
        `${stats.dialogueBlocks} blocks, average ${stats.avgBlockWords} words.`
    );
    this.root.setAttr("aria-label-position", "top");
    this.root.show();
  }
}
