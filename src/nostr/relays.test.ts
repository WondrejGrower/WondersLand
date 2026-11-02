import { expect, it, vi } from "vitest";
vi.mock("./storage", () => ({ getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) }));
import { getEnabledRelayUrls, getRelays, setRelayEnabled } from "./relays";

it("honors disabling every relay instead of silently reconnecting to defaults", () => {
  const original = getRelays();
  try {
    for (const relay of original) setRelayEnabled(relay.url, false);
    expect(getEnabledRelayUrls()).toEqual([]);
  } finally {
    for (const relay of original) setRelayEnabled(relay.url, relay.enabled);
  }
});
