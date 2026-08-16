# Per-user gardens persisted on Nostr

Each pubkey owns a garden. The garden layout lives in one signed, replaceable Nostr event —
no backend, no database. Weedoshi diaries stay the source of *what* is grown; a new
GardenConfig event describes *where and how* it appears in the 3D world.

## 1. Event format

Use NIP-78 application data: **kind 30078**, `d` tag `wondersland:garden-config`.

Rationale: the app already reads 30078 for diaries and the relays already carry it; a
namespaced `d` tag cannot collide because Weedoshi's diary parser only accepts events
tagged `t: weedoshi-diary` / `weedoshi` or with a `d` starting `diary-`. Nothing about
existing diaries changes. A custom kind would need relay support with no gain.

```
kind: 30078
tags:
  ["d", "wondersland:garden-config"]
  ["t", "wondersland"]
  ["client", "wondersland"]
  ["schema", "1"]
  ["rev", "<monotonic integer>"]
  ["updated_at", "<unix seconds>"]
content: JSON.stringify(GardenConfig)   // plaintext, public, no media, no keys
```

Existing diary parsing gets one defensive guard: skip any `d` tag starting `wondersland:`.

## 2. GardenConfig schema (`src/garden/config.ts`)

```ts
export const GARDEN_SCHEMA_VERSION = 1;

export type Vec3 = [number, number, number];

export type PlacedAsset = {
  id: string;            // stable instance id
  assetId: string;       // registry key, e.g. "prop.bench.wood"
  position: Vec3;
  rotationY: number;
  scale: number;
};

export type ZonePlacement = {
  id: ZoneId;            // house | raised-beds | orchard | greenhouse | open-garden
  unlocked: boolean;
  center: [number, number];
  rotationY: number;
};

export type PlantPlacement = {
  diaryId: string;       // Weedoshi diary id (d-tag suffix)
  zone: ZoneId;
  slot: number;
  position?: Vec3;       // set only when moved off its slot
  rotationY?: number;
  scale?: number;
  modelOverride?: ModelKey;
  pinned?: boolean;      // true = user placed it, never auto-reflow
};

export type GardenConfig = {
  schema: number;              // GARDEN_SCHEMA_VERSION
  owner: string;               // hex pubkey
  worldVersion: number;        // world geometry generation this layout targets
  rev: number;                 // monotonic, incremented per publish
  createdAt: number;
  updatedAt: number;
  zones: ZonePlacement[];
  plants: PlantPlacement[];
  decor: PlacedAsset[];
};
```

Only ids, numbers and enums. No GLB bytes, no textures, no base64. Media stays as
existing diary URLs / future Blossom hashes referenced by string.

## 3. Ownership and auth rules

| Mode | Read garden | Edit locally | Publish |
|---|---|---|---|
| NIP-07 extension | yes | yes | yes |
| local nsec signer (if added) | yes | yes | yes |
| npub / nprofile paste | yes | no (UI disabled) | never |
| signed out | public gardens only | no | never |

- `canEdit = session.method !== "npub" && session.pubkey === config.owner`.
- Accept a fetched config only if `event.pubkey === expectedOwner`, the signature
  verifies (`verifyEvent` from nostr-tools), `content.owner === event.pubkey`, and the
  JSON passes a zod-style validator. Anything else is dropped and logged, never rendered.
- The signer layer (`src/nostr/signers/*`) is the only place a private key may exist.
  `GardenConfig` has no key field; the publish path takes an unsigned event template and
  returns a signed event — it never receives or returns key material. NIP-46 slots in as
  another signer implementation later with zero changes above it.

## 4. Local cache

IndexedDB via the existing `src/nostr/storage.ts` kv (`wl:` prefix):

```
garden:<pubkey>        -> { event: NostrEvent, config: GardenConfig, fetchedAt }
garden:<pubkey>:draft  -> { config, dirtyAt }   // unpublished owner edits
```

The raw signed event is cached alongside the parsed config so a restored cache can be
re-verified and re-published unchanged after a failed publish.

## 5. Load lifecycle

1. Resolve pubkey (restored session, extension, or pasted npub).
2. Read `garden:<pubkey>` from IndexedDB, validate, push into `useGardenStore`.
   The 3D scene renders immediately from cache or from the deterministic default —
   it never awaits the network.
3. In parallel, query relays for `{kinds:[30078], authors:[pubkey], "#d":["wondersland:garden-config"]}`.
4. Verify signature, owner, schema; migrate if `schema < current`.
5. Reconcile (section 7), update Zustand, write cache.
6. If no remote and no cache: build a deterministic default from `pubkey + diaries`
   (existing `mapDiariesToGarden`, slot index seeded by a hash of pubkey+diaryId) so the
   same garden appears on every device. Nothing is published until the owner saves.
7. Visitors follow the same path, minus every write.

## 6. Save lifecycle

```
3D drag → useGardenStore.setPlacement() → dirty flag + local draft write (immediate)
        → debounce 3–5 s of inactivity (or explicit "Save garden")
        → build config { rev: rev+1, updatedAt: now } → signer.signEvent
        → publish to all enabled relays → collect per-relay OK
        → cache signed event → clear dirty
```

- No Nostr call ever happens inside `useFrame`. Drag updates write to refs; the store
  is touched once on pointer-up.
- Publishing is serialized: one in-flight publish per pubkey, later edits coalesce into
  the next one.

## 7. Reliability and conflicts

- **Multi-relay publish**: `Promise.allSettled` over enabled relays; success = ≥1 OK.
  Partial failure surfaces a quiet "saved to 3/5 relays" note and retries the failures
  with backoff.
- **Total failure / offline**: draft stays in IndexedDB with `dirtyAt`; a retry runs on
  reconnect and on next sign-in. UI shows "unsaved changes".
- **Optimistic updates**: local state applies instantly; a failed publish never rolls back
  silently, it keeps the draft.
- **Event ordering** follows NIP-01 addressable-event semantics, not application data:
  higher `created_at` wins; on a tie the **lowest event id** wins. `rev` is application
  metadata for display and draft provenance only and never overrides this ordering.
- **Conflict**: compare remote against the draft's recorded base (`baseEventId`,
  `baseCreatedAt`, `baseRev`). Remote newer + no draft → adopt remote. Remote newer than the
  base + a draft exists → the garden was edited on another device: warn and let the owner
  choose Keep mine / Load theirs. No silent merge.

- **Missing asset ids** after a world update: unknown `assetId` / `modelOverride` falls back
  to the category-generic model and the entry is preserved so a later world version can
  restore it. Unknown `zone` falls back to `open-garden`.
- **Storage cleared**: nothing is lost — the signed event on relays is the source of truth.
- **Malicious events**: only the owner's own pubkey is queried; validator caps array sizes
  (plants ≤ 500, decor ≤ 500), clamps positions to world bounds, rejects NaN/Infinity, and
  drops unknown fields.

## 8. Modules

```
src/garden/
  config.ts        GardenConfig types + GARDEN_SCHEMA_VERSION
  validate.ts      parse/validate/clamp untrusted JSON -> GardenConfig | null
  defaults.ts      deterministic default garden from pubkey + diaries
  migrate.ts       schema v(n) -> v(current)
  mapping.ts       (existing) diaries -> plants, now respects PlantPlacement
src/nostr/
  garden.ts        build/fetch/publish the 30078 wondersland:garden-config event
  publish.ts       multi-relay publish with per-relay results + retry
  signers/index.ts signer interface: getPublicKey(), signEvent(template)
src/state/
  useGardenStore.ts  config, dirty, syncStatus, canEdit, setPlacement, save()
```

`src/nostr/**` and `src/garden/**` stay free of three/R3F. `src/world/**` only reads the
store. Nothing in the current 3D world, avatar, controls or diary reading changes.

## 9. Versioning

- `schema` gates the config shape; `migrate.ts` upgrades old configs on read and the next
  save writes the new version. Never write an older schema.
- `worldVersion` gates coordinates: if the stored world version is older than the current
  world, zone centers are re-read from `zones.ts` and non-`pinned` plants reflow to fresh
  slots; pinned plants keep their explicit positions.

## 10. Phases

1. Schema + validator + deterministic defaults + migrations (pure TS, unit-tested).
2. `useGardenStore` reading defaults, wired into `GardenPlants.tsx` (no network).
3. Read path: fetch, verify, cache, reconcile; visitors fully working.
4. Signer interface + write path: publish, per-relay results, draft/retry.
5. Owner editing UI: select/move/rotate a plant, debounced save, sync indicator.
6. Conflict UX + relay-status panel.
7. Later: NIP-46 signer, decor placement, zone unlocking.

## 11. Security risks

- **nsec** must never enter `GardenConfig`, Zustand, IndexedDB under a garden key, logs, or
  any event content. Only the signer module may hold it, in memory, behind a narrow
  interface. Reject a config at validation time if it contains an `nsec1…` substring.
- Garden events are **public and unencrypted** — never put private notes or precise
  personal data in them.
- Never trust `content.owner`; trust the verified `event.pubkey`.
- Extension signing must be user-initiated (a save action), never automatic on load.
