// Fail-closed outbound secret protection (audit F2).
//
// Every string that is about to be signed, published, logged or reported is
// checked here first. The check is deliberately narrow: recognizable private
// keys only. Plain 64-character hex is NOT rejected, because Nostr public keys
// and event ids are legitimate hex and appear in ordinary notes and tags.
//
// Key material never enters this module. A local signer registers a *matcher*
// callback so its own secret can be recognized without ever being exported.

export class SecretLeakError extends Error {
  constructor(where: string) {
    super(
      `That looks like a private key (nsec). WondersLand refuses to publish it. ` +
        `Remove it and try again. (blocked at: ${where})`,
    );
    this.name = "SecretLeakError";
  }
}

/** bech32 charset, minus the human-readable part. */
const BECH32 = "02-9ac-hj-np-z";
const NSEC_RE = new RegExp(`nsec1[${BECH32}]{20,}`);
const HEX64_RE = /[0-9a-f]{64}/g;

type SecretMatcher = (candidateHex: string) => boolean;

let localMatcher: SecretMatcher | null = null;

/** Called by the in-memory signer only. Passing null unregisters it. */
export function setLocalSecretMatcher(matcher: SecretMatcher | null): void {
  localMatcher = matcher;
}

/**
 * Collapse the tricks that would otherwise smuggle an nsec past a naive regex:
 * URL encoding, JSON \u escapes, casing, whitespace and separator padding.
 */
function normalize(value: string): string {
  let text = value.slice(0, 100_000);
  if (/%[0-9a-f]{2}/i.test(text)) {
    try {
      text = decodeURIComponent(text.replace(/\+/g, " "));
    } catch {
      // keep the raw text; the checks below still run
    }
  }
  text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_m, code: string) =>
    String.fromCharCode(parseInt(code, 16)),
  );
  return text.toLowerCase().replace(/[\s\-_.:,/\\|"'`]+/g, "");
}

/** True when the value contains a private key we can recognize. */
export function containsSecret(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const text = normalize(value);
  if (NSEC_RE.test(text)) return true;
  if (!localMatcher) return false;
  const matches = text.match(HEX64_RE);
  if (!matches) return false;
  for (const candidate of matches) {
    try {
      if (localMatcher(candidate)) return true;
    } catch {
      // a broken matcher must never open the gate
      return true;
    }
  }
  return false;
}

/** Throws SecretLeakError when any value carries a private key. */
export function assertSecretFree(values: readonly unknown[], where: string): void {
  for (const value of values) {
    if (containsSecret(value)) throw new SecretLeakError(where);
  }
}

type TemplateLike = { content?: unknown; tags?: unknown; kind?: unknown };

/** Content + every tag string of an event template or signed event. */
export function collectEventStrings(event: TemplateLike): unknown[] {
  const out: unknown[] = [event.content];
  if (Array.isArray(event.tags)) {
    for (const tag of event.tags) {
      if (Array.isArray(tag)) out.push(...tag);
      else out.push(tag);
    }
  }
  return out;
}

export function guardEvent(event: TemplateLike, where: string): void {
  assertSecretFree(collectEventStrings(event), where);
}

/** Replace anything key-shaped with a marker. Used for logs and telemetry. */
export function redactSecrets(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;
  let out = text.replace(new RegExp(`nsec1[${BECH32}]{20,}`, "gi"), "[redacted-nsec]");
  if (localMatcher) {
    out = out.replace(/[0-9a-fA-F]{64}/g, (hex) => {
      try {
        return localMatcher?.(hex.toLowerCase()) ? "[redacted-key]" : hex;
      } catch {
        return "[redacted-key]";
      }
    });
  }
  // Catch obfuscated variants (URL/JSON encoded, separator padded) too.
  if (containsSecret(out)) return "[redacted — message contained key material]";
  return out;
}
