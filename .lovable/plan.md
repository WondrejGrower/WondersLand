# Research: multiplayer over Nostr for WondersLand (no code)

Goal: find out whether other signed-in players could appear in the garden via Nostr, what it costs in speed and privacy, and write down a recommendation. No product code changes; the project rule banning multiplayer stays in place.

## What gets researched

1. **Existing work** — public Nostr multiplayer/game projects (the Notedeck/jb55 post, NIPs for ephemeral events, other Nostr games) and how they send player positions.
2. **Transport** — ephemeral events (kinds 20000–29999) vs regular events; which relays accept them, rate limits, typical delay.
3. **Budget** — how often to send a position (e.g. 2–5 per second, only while moving), bandwidth per player, how many players are realistic, smoothing between updates.
4. **Privacy and safety** — positions are public and signed; spam/fake players; blocking; opt-in "show me to others"; read-only (npub) sessions can see but not appear.
5. **Fit with our code** — the reusable parts (relay pool, signer, the character controller, avatar) and what a pilot would add (a small presence module plus a "ghost" avatar render), respecting one scene, no per-frame React state, and no allocation inside the render loop.

## Output

- A new `docs/MULTIPLAYER_RESEARCH.md` covering findings, sources, a recommended minimal pilot (scope, event format, limits), and open risks.
- ROADMAP.md: a "research done, pilot pending approval" note.
- No changes to the app itself.

## Next step after research

You decide whether to approve a small pilot (see other players walking, nothing saved).
