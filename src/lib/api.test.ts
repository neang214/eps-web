import { describe, expect, it } from "vitest";
import { audioUrl } from "./api";

describe("audio addresses", () => {
  it("has no version part when none is given", () => {
    expect(audioUrl("L-0001.mp3")).toBe("/api/public/audio/L-0001.mp3");
  });

  it("puts the pack version in the address, so an updated pack never plays an old cached file", () => {
    expect(audioUrl("L-0001.mp3", 1)).toBe("/api/public/audio/L-0001.mp3?v=1");
    expect(audioUrl("L-0001.mp3", 2)).not.toBe(audioUrl("L-0001.mp3", 1));
    expect(audioUrl("L-0001.mp3", 0)).toBe("/api/public/audio/L-0001.mp3?v=0");
  });

  it("encodes unusual file names", () => {
    expect(audioUrl("a b.mp3", 3)).toBe("/api/public/audio/a%20b.mp3?v=3");
  });
});
