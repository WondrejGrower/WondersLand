import { describe, expect, it } from "vitest";
import { DEFAULT_LENS_CONFIG, importLensConfig, normalizeLensConfig } from "./config";
import { rankNotes } from "./rank";
import { scoreNote, type LensContext } from "./signals";
import type { NostrEvent } from "../types";

const now = 1_700_000_000_000;

const note = (over: Partial<NostrEvent>): NostrEvent =>
  ({
    id: Math.random().toString(36).slice(2),
    pubkey: "author-1",
    created_at: Math.floor(now / 1000),
    kind: 1,
    tags: [],
    content: "",
    sig: "",
    ...over,
  }) as NostrEvent;

const ctx = (over: Partial<LensContext> = {}): LensContext => ({
  config: DEFAULT_LENS_CONFIG,
  now,
  follows: new Set(),
  growers: new Set(),
  ...over,
});

describe("scoreNote", () => {
  it("rewards grow vocabulary even without hashtags", () => {
    const { score, signals } = scoreNote(
      note({ content: "Repotted the seedling today, the living soil smells great." }),
      ctx(),
    );
    expect(score).toBeGreaterThan(DEFAULT_LENS_CONFIG.minScore);
    expect(signals.map((s) => s.id)).toContain("vocabulary");
  });

  it("penalises link walls and tag stuffing", () => {
    const spam = note({
      content: "#a #b #c #d #e #f #g #h #i http://a.com http://b.com http://c.com http://d.com",
      tags: Array.from({ length: 14 }, (_, i) => ["t", `tag${i}`]),
    });
    const { score, signals } = scoreNote(spam, ctx());
    expect(score).toBeLessThan(DEFAULT_LENS_CONFIG.minScore);
    expect(signals.find((s) => s.id === "spam")?.points).toBeLessThan(0);
  });

  it("boosts people you follow and known growers", () => {
    const event = note({ content: "Day 21 of the tent, canopy filling in nicely." });
    const plain = scoreNote(event, ctx()).score;
    const boosted = scoreNote(
      event,
      ctx({ follows: new Set(["author-1"]), growers: new Set(["author-1"]) }),
    ).score;
    expect(boosted).toBeGreaterThan(plain);
  });

  it("fades old notes", () => {
    const fresh = scoreNote(note({ content: "Harvest day, trimming the flower." }), ctx()).score;
    const old = scoreNote(
      note({
        content: "Harvest day, trimming the flower.",
        created_at: Math.floor(now / 1000) - 30 * 86_400,
      }),
      ctx(),
    ).score;
    expect(old).toBeLessThan(fresh);
  });
});

describe("rankNotes", () => {
  it("caps how many notes one author can take", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      note({ id: `n${i}`, content: `Watering the plants in living soil, day ${i + 1}` }),
    );
    const ranked = rankNotes(events, ctx(), 10);
    expect(ranked).toHaveLength(DEFAULT_LENS_CONFIG.maxPerAuthor);
  });

  it("drops notes under the threshold", () => {
    const ranked = rankNotes([note({ content: "gm" })], ctx(), 10);
    expect(ranked).toHaveLength(0);
  });
});

describe("config", () => {
  it("normalises unknown input into a usable config", () => {
    const config = normalizeLensConfig({ weights: { vocabulary: 99 }, hashtags: ["#Grow", "grow"] });
    expect(config.weights.vocabulary).toBe(10);
    expect(config.hashtags).toEqual(["grow"]);
  });

  it("imports exported JSON", () => {
    const json = JSON.stringify(DEFAULT_LENS_CONFIG);
    expect(importLensConfig(json)).toEqual(DEFAULT_LENS_CONFIG);
  });
});
