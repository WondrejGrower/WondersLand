import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadBlob } from "./blossom";
import type { Signer } from "./signers";

const signer: Signer = {
  method: "nsec",
  getPublicKey: async () => "a".repeat(64),
  signEvent: async (template) => ({
    ...template,
    id: "b".repeat(64),
    pubkey: "a".repeat(64),
    sig: "c".repeat(128),
  }),
};

const image = () => new File([new Uint8Array([1, 2, 3])], "leaf.jpg", { type: "image/jpeg" });

afterEach(() => vi.unstubAllGlobals());

describe("uploadBlob", () => {
  it("returns the blob url and sends kind 24242 upload auth", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://blossom.example/abc.jpg", sha256: "abc", size: 3 }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const blob = await uploadBlob(signer, image(), "https://blossom.example");
    expect(blob.url).toBe("https://blossom.example/abc.jpg");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://blossom.example/upload");
    expect(init.method).toBe("PUT");
    const auth = String((init.headers as Record<string, string>)["Authorization"]);
    const event = JSON.parse(atob(auth.replace("Nostr ", "")));
    expect(event.kind).toBe(24242);
    expect(event.tags).toContainEqual(["t", "upload"]);
  });

  it("fails clearly when the server rejects the upload", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 401 }));
    await expect(uploadBlob(signer, image(), "https://blossom.example")).rejects.toThrow(/refused/);
  });

  it("fails clearly when the server is unreachable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("network");
    });
    await expect(uploadBlob(signer, image(), "https://blossom.example")).rejects.toThrow(/reached/);
  });

  it("rejects non-images", async () => {
    const doc = new File(["x"], "a.pdf", { type: "application/pdf" });
    await expect(uploadBlob(signer, doc, "https://blossom.example")).rejects.toThrow(/not an image/);
  });
});
