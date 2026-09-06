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
    const { score, signals } = scoreNote(event, ctx);
    if (score < ctx.config.minScore) continue;
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
