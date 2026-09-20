const test = require("node:test");
const assert = require("node:assert/strict");
const { pickBand, pickColor, normalizeThresholds } = require("../out/core/bands.js");

const T = { lowThreshold: 15, highThreshold: 40 };

test("band edges: 14 low, 15 target, 40 target, 41 high", () => {
  assert.equal(pickBand(14, T), "low");
  assert.equal(pickBand(15, T), "target");
  assert.equal(pickBand(40, T), "target");
  assert.equal(pickBand(41, T), "high");
});

test("zero and one hundred", () => {
  assert.equal(pickBand(0, T), "low");
  assert.equal(pickBand(100, T), "high");
});

test("swapped thresholds behave as low 10, high 50", () => {
  const swapped = { lowThreshold: 50, highThreshold: 10 };
  assert.deepEqual(normalizeThresholds(swapped), { lowThreshold: 10, highThreshold: 50 });
  assert.equal(pickBand(9, swapped), "low");
  assert.equal(pickBand(30, swapped), "target");
  assert.equal(pickBand(51, swapped), "high");
});

test("equal thresholds: only that exact value is target", () => {
  const eq = { lowThreshold: 30, highThreshold: 30 };
  assert.equal(pickBand(29, eq), "low");
  assert.equal(pickBand(30, eq), "target");
  assert.equal(pickBand(31, eq), "high");
});

test("pickColor maps band to color", () => {
  const c = { lowColor: "blue", targetColor: "green", highColor: "orange" };
  assert.equal(pickColor("low", c), "blue");
  assert.equal(pickColor("target", c), "green");
  assert.equal(pickColor("high", c), "orange");
});
