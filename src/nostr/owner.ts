/**
 * The single WondersLand owner identity.
 *
 * Used only to gate the hidden layout editor. This is a convenience gate for
 * the owner's own browser, not a security boundary: the editor changes nothing
 * outside the local session.
 */

/** npub1c0cj4x59hm4yd6nrrj2k22shuqknhjlyw773wzf4pushupkzzvqsjelp5x */
export const OWNER_PUBKEY = "c3f12a9a85beea46ea631c95652a17e02d3bcbe477bd1709350f217e06c21301";

export function isOwner(pubkey: string | null | undefined): boolean {
  return typeof pubkey === "string" && pubkey.toLowerCase() === OWNER_PUBKEY;
}
