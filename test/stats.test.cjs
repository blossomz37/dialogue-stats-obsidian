const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { analyze, stripFrontMatter, countWords } = require("../out/core/stats.js");

const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");

// Baseline from: python3 ~/.myagents/tools/scripts/dialogue-ratio.py --format json
// Fields: total, dialogue, prose, dialogue_pct (1 decimal), blocks, avg_block_words
const PYTHON_BASELINE = {
  "pride-and-prejudice-chapter-1.md": [849, 668, 181, 78.7, 32, 20.9],
  "pride-and-prejudice-chapter-2.md": [798, 567, 231, 71.1, 32, 17.7],
  "pride-and-prejudice-chapter-3.md": [1694, 577, 1117, 34.1, 18, 32.1],
  "pride-and-prejudice-chapter-4.md": [1055, 340, 715, 32.2, 11, 30.9],
  "pride-and-prejudice-chapter-5.md": [948, 642, 306, 67.7, 30, 21.4],
};

for (const [file, [total, dialogue, prose, pct, blocks, avg]] of Object.entries(PYTHON_BASELINE)) {
  test(`parity with dialogue-ratio.py: ${file}`, () => {
    const s = analyze(fixture(file));
    assert.equal(s.totalWords, total);
    assert.equal(s.dialogueWords, dialogue);
    assert.equal(s.proseWords, prose);
    assert.equal(s.dialoguePercent, Math.round(pct));
    assert.equal(s.dialogueBlocks, blocks);
    assert.equal(s.avgBlockWords, avg);
  });
}

test("front matter: quoted title does not count", () => {
  const src = '---\ntitle: "The Ashwood Gate"\nchapter: 12\n---\n\nMara reached for the latch.\n';
  const s = analyze(src);
  assert.equal(s.totalWords, 5);
  assert.equal(s.dialogueWords, 0);
  assert.equal(s.dialogueBlocks, 0);
});

test("front matter: closing --- must be on its own line", () => {
  const src = "---\ntitle: a --- b\n---\nOne two three\n";
  assert.equal(stripFrontMatter(src), "One two three\n");
});

test("front matter: no closing line keeps whole text", () => {
  const src = "---\ntitle: a\nOne two three\n";
  assert.equal(stripFrontMatter(src), src);
});

test("front matter: ... also closes", () => {
  const src = "---\ntitle: a\n...\nOne two\n";
  assert.equal(stripFrontMatter(src), "One two\n");
});

test("front matter: not at line 1 is not stripped", () => {
  const src = "Hello\n---\ntitle: a\n---\nOne two\n";
  assert.equal(analyze(src).totalWords, 5);
});

test("sample chapter from idea-01 → 25 words, 40% (hand-counted; idea-01 guessed 31/45%)", () => {
  const src = [
    "---",
    'title: "The Ashwood Gate"',
    "chapter: 12",
    "status: drafting",
    "---",
    "",
    "Mara reached for the latch. Rain drummed against the old door.",
    "",
    '"Don\'t open it," Elias said.',
    "",
    'She froze. "Why not?"',
    "",
    '"Because something is already inside."',
    "",
  ].join("\n");
  const s = analyze(src);
  assert.equal(s.totalWords, 25);
  assert.equal(s.dialogueWords, 10);
  assert.equal(s.dialoguePercent, 40);
  assert.equal(s.dialogueBlocks, 3);
});

test("empty file → zeros", () => {
  assert.deepEqual(analyze(""), {
    totalWords: 0, dialogueWords: 0, proseWords: 0, dialoguePercent: 0, dialogueBlocks: 0, avgBlockWords: 0,
  });
});

test("no quotes → 0%", () => {
  const s = analyze("Just some prose with no talking at all.");
  assert.equal(s.totalWords, 8);
  assert.equal(s.dialoguePercent, 0);
});

test("curly open + straight close → one span", () => {
  const s = analyze('She said, “hello there" and left.');
  assert.equal(s.dialogueBlocks, 1);
  assert.equal(s.dialogueWords, 2);
});

test("multi-line quote → one span", () => {
  const s = analyze('"Line one\nline two\nline three." Then prose.');
  assert.equal(s.dialogueBlocks, 1);
  assert.equal(s.dialogueWords, 6);
  assert.equal(s.proseWords, 2);
});

test("heading lines and horizontal rules do not count", () => {
  const s = analyze('# Chapter "One"\n\nProse here.\n\n---\n\n## Scene 2\n\nMore prose.');
  assert.equal(s.totalWords, 4);
  assert.equal(s.dialogueBlocks, 0);
});

test("CRLF line endings are normalized", () => {
  const s = analyze('---\r\ntitle: x\r\n---\r\n"Hi there." She waved.\r\n');
  assert.equal(s.totalWords, 4);
  assert.equal(s.dialogueWords, 2);
});

test("nested single quotes count once as part of the outer span", () => {
  const s = analyze('"She said, ‘leave now,’ and ran," he told me.');
  assert.equal(s.dialogueBlocks, 1);
  assert.equal(s.dialogueWords, 6);
});

test("countWords splits on whitespace like Python str.split()", () => {
  assert.equal(countWords("  a\tb\n\nc  "), 3);
  assert.equal(countWords("well — no"), 3);
  assert.equal(countWords(""), 0);
});
