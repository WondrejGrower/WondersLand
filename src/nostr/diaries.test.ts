import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NostrEvent } from "./types";

const mocks = vi.hoisted(() => ({ read: vi.fn(), query: vi.fn() }));
vi.mock("./pool", () => ({ queryWithSources: mocks.read, query: mocks.query }));
vi.mock("./relays", () => ({ getEnabledRelayUrls: () => ["wss://example.test"] }));
vi.mock("./storage", () => ({ getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) }));
import { fetchCommunityDiaries, fetchDiaries } from "./diaries";

const author = "a".repeat(64);
function event(body: unknown, options: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: "e".repeat(64), pubkey: author, sig: "0".repeat(128), kind: 30078,
    created_at: 1000, tags: [["d", "diary-test"], ["t", "weedoshi-diary"]],
    content: JSON.stringify(body), ...options,
  };
}
function returnEvents(events: NostrEvent[]) {
  mocks.read.mockResolvedValue({ events, sources: new Map() });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue([]);
  returnEvents([]);
});

describe("public grow diary discovery", () => {
  it("keeps valid diaries while sanitizing untrusted field types", async () => {
    returnEvents([event({ title: 42, plant: [], phase: {}, cultivar: false, endedAt: null, items: [null, 42] })]);
    const diaries = await fetchCommunityDiaries();
    expect(diaries).toHaveLength(1);
    expect(diaries[0]).toMatchObject({ title: "test", items: [], sourceDTag: "diary-test" });
    expect(diaries[0]?.plant).toBeUndefined();
    expect(diaries[0]?.phase).toBeUndefined();
    expect(diaries[0]?.endedAt).toBeUndefined();
  });

  it.each([null, [], "encrypted:payload"])("skips non-object content %j", async (body) => {
    returnEvents([event(body)]);
    expect(await fetchCommunityDiaries()).toEqual([]);
  });

  it("skips malformed JSON without losing a valid grower", async () => {
    returnEvents([event({}, { content: "not JSON" }), event({ title: "Valid" }, { pubkey: "b".repeat(64) })]);
    expect((await fetchCommunityDiaries()).map((d) => d.title)).toEqual(["Valid"]);
  });

  it.each([
    { isPublic: false }, { public: false }, { private: true },
    { visibility: "unlisted" }, { visibility: "private" }, { isPublic: "false" },
  ])("respects visibility %j", async (visibility) => {
    returnEvents([event({ title: "Not for Explore", ...visibility })]);
    expect(await fetchCommunityDiaries()).toEqual([]);
    // Owner compatibility: a display flag does not erase their own diary.
    expect(await fetchDiaries(author)).toHaveLength(1);
  });

  it("never promotes reserved tasks or unrelated app data even with a diary tag", async () => {
    returnEvents([
      event({ title: "Private board" }, { tags: [["d", "wondersland:tasks:v1"], ["t", "weedoshi-diary"]] }),
      event({ title: "Unrelated application" }, { tags: [["d", "wondersland:other-app:v1"], ["t", "weedoshi"]] }),
      event({ title: "Unrelated" }, { tags: [["d", "other-data"]] }),
    ]);
    expect(await fetchCommunityDiaries()).toEqual([]);
  });

  it("uses author plus exact d value and deterministic event-id ties", async () => {
    returnEvents([
      event({ title: "Old" }, { created_at: 900 }),
      event({ title: "Tie loses" }, { id: "f".repeat(64) }),
      event({ title: "Newest" }, { id: "b".repeat(64) }),
      event({ title: "Other grower" }, { pubkey: "c".repeat(64) }),
      event({ title: "Case-sensitive address" }, { tags: [["d", "diary-Test"], ["t", "weedoshi-diary"]] }),
    ]);
    expect((await fetchCommunityDiaries()).map((d) => d.title).sort()).toEqual([
      "Case-sensitive address", "Newest", "Other grower",
    ]);
  });

  it("does not resurrect an older public copy after a private revision", async () => {
    returnEvents([
      event({ title: "Old public" }, { created_at: 900 }),
      event({ title: "Now private", isPublic: false }),
    ]);
    expect(await fetchCommunityDiaries()).toEqual([]);
  });

  it("accepts legacy diary tags and safe image references", async () => {
    const image = "https://images.example.test/plant.webp";
    returnEvents([event({ title: "Grow", coverImage: "javascript:bad", items: [
      { eventId: "1".repeat(64), image, mediaUrls: [image, "javascript:bad", 12] },
    ] }, { tags: [["d", "diary-legacy"], ["t", "weedoshi"]] })]);
    const [diary] = await fetchCommunityDiaries();
    expect(diary?.items[0]?.mediaUrls).toEqual([image]);
    expect(diary?.items[0]?.authorPubkey).toBe(author);
    expect(diary?.coverImage).not.toBe("javascript:bad");
  });
});
