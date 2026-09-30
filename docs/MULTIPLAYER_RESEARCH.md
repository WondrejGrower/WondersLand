# Multiplayer over Nostr — research (2026-09-30)

Status: research only. Multiplayer is still banned by AGENTS.md until the owner approves a pilot.

## 1. Existing work

- **jb55 / Notedeck "nostrverse"** — a nostr MMO announced by jb55 in the nevent `1bb7fc83…` (kind 1, client Damus Notedeck). Notedeck is public on GitHub (damus-io/notedeck), and its changelog mentions "nostrverse: add dedicated relay support for multiplayer sync". The code is Rust/egui, so we can't reuse it directly, but the approach (a dedicated relay for sync) is public.
  https://github.com/damus-io/notedeck · https://pareto.space (notedeck changelog)
- **NostrSpace** — a browser 3D proof of concept. Movement goes out as ephemeral kind 29211 with a `nostr-space-movement` tag; each player's base is a replaceable event. It's the closest match to our stack (JS, browser).
  https://dorahacks.io/buidl/6709 · github.com/bongatores/nostrSpace
- **nostr-arena** (Rust/WASM, npm): rooms, presence heartbeat, and join/leave, all over relays. https://github.com/kako-jun/nostr-arena
- **disastr / Nostr Game Engine**: use relays only as WebRTC signalling, then send game data peer-to-peer. Fast, but heavy and fragile on mobile networks.
  https://codeberg.org/disastr/disastr · https://nostrverse.org

## 2. Transport

- Relays don't store **ephemeral events (kinds 20000–29999)** (NIP-01). That's the right fit for position updates: no history and no storage load.
- Not every public relay forwards ephemeral events quickly, and many rate-limit per pubkey. The pilot should use 1–2 known relays (for example a dedicated WondersLand relay later). Don't use the whole relay list.
- Expect roughly 100–400 ms delay through a relay. That's fine for a cozy walk-around, but not for action gameplay.
- WebRTC peer-to-peer is out of scope for a pilot.

## 3. Budget

- Send a position only while moving, at about 3 per second, plus a heartbeat every 10 s when idle. A player counts as gone after 30 s of silence.
- Each event is about 350 bytes signed, so one moving player costs about 1 KB/s up. Ten visible players cost about 10 KB/s down. Fine on a phone.
- Signing: a local key signs silently. NIP-07 extensions may show a prompt for every signature, which makes them unusable here. The pilot would need a throwaway **session presence key** (generated per visit and linked to the real npub by one signed event), or presence would be limited to local-key users.
- Rendering: cap the number of visible ghosts at 8–12. Interpolate each one between the last two updates in `useFrame` using hoisted scratch vectors, with no React state per frame. Use a simplified avatar (one shared mesh/material) to keep draw calls low.

## 4. Privacy and safety

- Positions are public and signed, so anyone can see who is online and when. Presence must be **opt-in** ("Show me to other visitors", off by default) in World Settings.
- Read-only (npub) sessions can see others but never appear themselves.
- Spam and fake players: accept only events with a valid signature, the correct tag, and in-bounds coordinates, and drop anything faster than a walking speed cap. A mute list could come later.
- Never publish private board, task, or diary data in presence events.

## 5. Fit with our code

Reusable: `nostr/pool.ts` (subscribe/publish), the signers, `CharacterController` (the position source), the avatar, and the `useFrame` patterns.
A pilot would add:
- `src/world/presence/presence.ts`: publish throttled kind-2xxxx events (tag `t=wondersland-presence`, content `{x,z,yaw,moving}`) and subscribe for others.
- `src/world/presence/Ghosts.tsx`: an instanced ghost render inside the existing Canvas that reads from a ref map.
- A World Settings toggle.
No backend, no storage, no new packages.

## Recommended minimal pilot

See others walking in the same garden: opt-in, local-key users only, 1–2 relays, max 10 ghosts, no chat, nothing saved. Estimated to fit in one small pass.

## Open risks

- Relay support for ephemeral events varies, so it needs a live test.
- The UX for NIP-07 users (session key vs excluded).
- Everyone currently sees their own garden layout, so a shared space means agreeing on one common world first.

## Shared world concept (owner decision, 2026-09-30)

- **Common Plaza:** one shared space with a fixed layout that everyone sees the same. A player teleports there from their own garden (for example from the arch or via a button). Presence subscribes only to `t=wondersland-presence` + `room=plaza`.
- **Garden invites:** at the Plaza a player can invite someone to their own garden. The invite is a signed ephemeral event to the recipient's pubkey (`p` tag, `room=garden:<hostPubkey>`). The guest loads the host's public GardenConfig (already on Nostr) and joins the room `garden:<host>`. Only invited pubkeys are shown/accepted in the room; the host can cancel the invite.
- This resolves the "every garden has its own layout" risk: the Plaza is shared, and a garden always renders the host's layout.
- Pilot order: 1) Plaza + presence, 2) invites to a garden.
