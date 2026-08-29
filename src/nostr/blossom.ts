// Minimal Blossom (BUD-02 upload + BUD-11 auth) client.
//
// Protocol only: no key material is ever touched here. Authorization is a
// kind 24242 event signed through the existing Signer boundary, short-lived
// and scoped to `t=upload`, the exact blob hash (`x`) and the configured
// server. Nothing is persisted — no token, no bytes, no secret.
import { BLOSSOM_BASE_URL } from "./endpoints";
import type { Signer } from "./signers";

export const KIND_BLOSSOM_AUTH = 24242;

/** Practical MVP ceiling; the server may still reject smaller blobs. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type BlobDescriptor = {
  url: string;
  sha256: string;
  size: number;
  type?: string | undefined;
};

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** BUD-11 upload authorization, valid for a couple of minutes only. */
async function uploadAuthHeader(signer: Signer, hash: string, server: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const event = await signer.signEvent({
    kind: KIND_BLOSSOM_AUTH,
    created_at: now,
    tags: [
      ["t", "upload"],
      ["x", hash],
      ["server", server],
      ["expiration", String(now + 120)],
    ],
    content: "Upload a photo to your WondersLand diary",
  });
  return `Nostr ${base64(JSON.stringify(event))}`;
}

function descriptorFrom(data: unknown, fallbackHash: string, size: number): BlobDescriptor | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const url = typeof record["url"] === "string" ? record["url"] : undefined;
  if (!url) return null;
  return {
    url,
    sha256: typeof record["sha256"] === "string" ? record["sha256"] : fallbackHash,
    size: typeof record["size"] === "number" ? record["size"] : size,
    type: typeof record["type"] === "string" ? record["type"] : undefined,
  };
}

/**
 * Upload one image blob and return its public descriptor.
 * Throws Error with human-readable, non-technical messages.
 */
export async function uploadBlob(
  signer: Signer,
  file: File,
  baseUrl: string = BLOSSOM_BASE_URL,
): Promise<BlobDescriptor> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image. Pick a photo instead.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is too large. Try one under 10 MB.");
  }

  const bytes = await file.arrayBuffer();
  const hash = await sha256Hex(bytes);
  const server = baseUrl.replace(/\/+$/, "");

  let auth: string;
  try {
    auth = await uploadAuthHeader(signer, hash, server);
  } catch {
    throw new Error("The upload was not authorized — try signing again.");
  }

  let response: Response;
  try {
    response = await fetch(`${server}/upload`, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size),
      },
      body: bytes,
    });
  } catch {
    throw new Error("The photo server can’t be reached right now. Your entry is still here.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("The photo server refused this upload.");
  }
  if (response.status === 413) {
    throw new Error("The photo server says that image is too large.");
  }
  if (!response.ok) {
    throw new Error("The photo could not be uploaded. Please try again.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The photo server sent an unexpected reply.");
  }
  const descriptor = descriptorFrom(payload, hash, file.size);
  if (!descriptor) throw new Error("The photo server sent an unexpected reply.");
  return descriptor;
}
