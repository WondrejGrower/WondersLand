import type { NostrEvent } from "../types";
import { isEmptyNote, scoreNote, type LensContext, type LensSignal } from "./signals";

export type RankedNote = {
  event: NostrEvent;
  score: number;
  signals: LensSignal[];
};

/**
 * Score every candidate, drop what falls under the threshold, then interleave
 * authors so a single prolific grower cannot fill the page.
 */
export function rankNotes(events: NostrEvent[], ctx: LensContext, limit: number): RankedNote[] {
  const seen = new Set<string>();
  const scored: RankedNote[] = [];
  for (const event of events) {
    if (seen.has(event.id) || isEmptyNote(event)) continue;
    seen.add(event.id);
    const { score, signals, topical } = scoreNote(event, ctx);
    if (score < ctx.config.minScore) continue;
    // A note from someone you follow is still not a grow note unless it talks
    // about growing — the social signals boost topical posts, they don't
    // qualify random ones.
    // One stray word ("seed" in a bitcoin post) is not a grow note: ask for a
    // grow hashtag or at least two grow words.
    if (ctx.config.requireTopical && topical.tags === 0 && topical.words < 2) continue;
    scored.push({ event, score, signals });
  }

  scored.sort((a, b) => b.score - a.score || b.event.created_at - a.event.created_at);

  const perAuthor = new Map<string, number>();
  const kept: RankedNote[] = [];
  for (const note of scored) {
    const used = perAuthor.get(note.event.pubkey) ?? 0;
    if (used >= ctx.config.maxPerAuthor) continue;
    perAuthor.set(note.event.pubkey, used + 1);
    kept.push(note);
    if (kept.length >= limit) break;
  }
  return kept;
}
