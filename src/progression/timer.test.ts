import { describe, expect, it } from "vitest";
import { growTimer } from "./timer";
import type { Diary } from "../nostr/types";

const base = (over: Partial<Diary>): Diary => ({
  id: "d1",
  authorPubkey: "pk",
  title: "Grow",
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
  items: [],
  ...over,
});

describe("growTimer", () => {
  it("counts the founding day as day 1", () => {
    const t = growTimer(base({}), 1_000_000 * 1000 + 3_600_000);
    expect(t.running).toBe(true);
    expect(t.days).toBe(1);
    expect(t.label).toBe("Day 1 · 01:00:00");
  });

  it("counts multi-day grows", () => {
    const t = growTimer(base({}), (1_000_000 + 86400 * 13 + 61) * 1000);
    expect(t.short).toBe("Day 14");
    expect(t.hms).toBe("00:01:01");
  });

  it("stops on a harvest phase", () => {
    const diary = base({ phase: "Harvested", updatedAt: 1_000_000 + 86400 * 42 });
    const t = growTimer(diary, (1_000_000 + 86400 * 90) * 1000);
    expect(t.running).toBe(false);
    expect(t.short).toBe("42 days");
    expect(t.label).toBe("Finished · 42 days");
  });

  it("prefers the newest finishing entry timestamp", () => {
    const diary = base({
      items: [
        {
          eventId: "e1",
          authorPubkey: "pk",
          createdAt: 1_000_000 + 86400 * 10,
          addedAt: 1_000_000,
          phaseLabel: "Curing",
        },
      ],
    });
    const t = growTimer(diary, (1_000_000 + 86400 * 50) * 1000);
    expect(t.endedAt).toBe(1_000_000 + 86400 * 10);
    expect(t.short).toBe("10 days");
  });
});
