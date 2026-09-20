/**
 * Pure counting core. PORTABLE.
 * No vscode, node, or obsidian imports. See docs/SPEC.md §4 for the contract.
 * Rules mirror /Users/carlo/.myagents/tools/scripts/dialogue-ratio.py so both
 * tools give the same answer for the same file.
 */

export interface DocumentStats {
  totalWords: number;
  dialogueWords: number;
  proseWords: number;
  /** Rounded to the nearest whole percent. 0 when totalWords is 0. */
  dialoguePercent: number;
  /** Number of quoted spans found. */
  dialogueBlocks: number;
  /** dialogueWords / dialogueBlocks, one decimal. 0 when no blocks. */
  avgBlockWords: number;
}

/** Text between a double quote and the next double quote. Straight or curly, may mix, spans lines. */
const QUOTE_RE = /[“"](.*?)[”"]/gs;
/** Markdown heading lines: `#` to `######` followed by whitespace. */
const HEADING_RE = /^#{1,6}\s+.*$/gm;
/** Horizontal rule lines made of three or more dashes. */
const HR_RE = /^---+\s*$/gm;

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/**
 * Strip YAML front matter. Only when the file starts with `---` on line 1.
 * The closing line must be exactly `---` or `...` on its own line.
 * If there is no closing line, the whole text is kept.
 */
export function stripFrontMatter(text: string): string {
  if (!(text.startsWith("---\n") || text === "---")) {
    return text;
  }
  const closing = /\n(?:---|\.\.\.)[ \t]*(?:\n|$)/g;
  closing.lastIndex = 3;
  const match = closing.exec(text);
  if (!match) {
    return text;
  }
  const afterClosing = match.index + match[0].length;
  return text.slice(afterClosing).replace(/^\n+/, "");
}

/** Remove heading lines and horizontal rules. Keep everything else. */
export function stripMarkdownStructure(text: string): string {
  return text.replace(HEADING_RE, "").replace(HR_RE, "");
}

/** Whitespace split. Each non-empty piece is one word. Matches Python `str.split()`. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/** Returns the inner text of every quoted span, in order. */
export function extractDialogueSpans(text: string): string[] {
  const spans: string[] = [];
  for (const m of text.matchAll(QUOTE_RE)) {
    spans.push(m[1] ?? "");
  }
  return spans;
}

export function analyze(source: string): DocumentStats {
  const body = stripMarkdownStructure(stripFrontMatter(normalizeLineEndings(source)));

  const spans = extractDialogueSpans(body);
  const dialogueText = spans.join(" ");
  const proseText = body.replace(QUOTE_RE, "");

  const dialogueWords = countWords(dialogueText);
  const proseWords = countWords(proseText);
  const totalWords = dialogueWords + proseWords;
  const dialogueBlocks = spans.length;

  return {
    totalWords,
    dialogueWords,
    proseWords,
    dialoguePercent: totalWords === 0 ? 0 : Math.round((dialogueWords / totalWords) * 100),
    dialogueBlocks,
    avgBlockWords: dialogueBlocks === 0 ? 0 : Math.round((dialogueWords / dialogueBlocks) * 10) / 10,
  };
}
