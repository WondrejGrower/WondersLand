# Dashboard as the post-login home + new Nostr sign-up

## Good news first
Nothing is broken. The dashboard already is the screen you get after signing in — the preview
just shows the public landing page because the preview browser is signed out. Sign in there and
the garden dashboard appears.

So this task is about two things: making that behaviour explicit and reliable, and letting people
who have no Nostr identity yet create one inside WondersLand.

## 1. Make the dashboard the real home after login
- Keep one route (`/`), but make its behaviour deterministic: signed out -> landing, signed in ->
  dashboard, "Enter Garden" -> 3D world.
- On sign-in, always return to the dashboard (never leave the user inside a stale world state).
- On sign-out, drop back to the landing page and clear session-derived UI state.
- Show a short "restoring your garden" state while the saved session is being restored, so the
  landing page does not flash for a returning user.

## 2. Create a new Nostr identity (registration)
A "New to Nostr? Create an identity" option next to the existing sign-in choices:

1. Generate a keypair in the browser, in memory only.
2. Show the `nsec` once, with copy-to-clipboard and a plain-language warning: this is the only
   copy, WondersLand cannot recover it, anyone holding it controls the account.
3. Require an explicit "I saved my key" confirmation before continuing.
4. Optionally take a display name and publish a kind 0 profile to the configured relays.
5. Sign the user in with the existing in-memory session signer and land them on the dashboard.
6. Recommend installing a NIP-07 extension for long-term use, shown after the account exists.

### Security rules (unchanged, enforced)
- The private key never touches localStorage, IndexedDB, GardenConfig, Zustand, URLs or logs.
- It lives only in the existing in-memory signer module and is zeroed on sign-out/refresh.
- Only the public key + auth method are persisted, exactly like today.
- No backend, no database, no key escrow. Generation uses `nostr-tools` (already installed).
- Refresh means re-entering the nsec, or better, using a NIP-07 extension — stated up front.

## Technical notes
- `src/ui/NostrSignIn.tsx`: add the create-identity step to the existing popover flow.
- `src/nostr/signers/local.ts`: add key generation next to the existing unlock function; keep the
  same module-scoped secret with zeroing.
- `src/nostr/profile.ts` / write path: optional kind 0 publish using the current write boundary.
- `src/state/useNostrStore.ts`: `createIdentity()` action reusing the existing `nsec` session path.
- `src/routes/index.tsx`: restore-in-progress gate and post-auth reset.
- No new packages, no new event schema, no changes to the 3D world, controls or diary parsing.
- Typecheck + build, then update PROJECT_STATE.md, AI_HANDOFF.md and CHANGELOG.md.
