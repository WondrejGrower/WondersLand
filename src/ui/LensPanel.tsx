// Grow Lens settings: the ranking is not a black box, so every weight, source
// and word list is editable here and exportable as JSON for other clients.
import { useState } from "react";

import {
  LENS_SIGNAL_IDS,
  SIGNAL_HINTS,
  SIGNAL_LABELS,
  exportLensConfig,
  type LensConfig,
} from "../nostr/lens/config";
import { useLensStore } from "../state/useLensStore";

const SOURCE_LABELS: { key: keyof LensConfig["sources"]; label: string; hint: string }[] = [
  { key: "hashtags", label: "Hashtags", hint: "Notes tagged with the words below." },
  { key: "follows", label: "People you follow", hint: "Your Nostr contact list." },
  { key: "diaryAuthors", label: "Grow diary authors", hint: "Anyone publishing grow diaries." },
];

function tagList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map((v) => v.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function LensPanel({ onClose, onApply }: { onClose: () => void; onApply: () => void }) {
  const config = useLensStore((s) => s.config);
  const setWeight = useLensStore((s) => s.setWeight);
  const setSource = useLensStore((s) => s.setSource);
  const setHashtags = useLensStore((s) => s.setHashtags);
  const setKeywords = useLensStore((s) => s.setKeywords);
  const setMinScore = useLensStore((s) => s.setMinScore);
  const setMaxPerAuthor = useLensStore((s) => s.setMaxPerAuthor);
  const importJson = useLensStore((s) => s.importJson);
  const reset = useLensStore((s) => s.reset);

  const [hashtagText, setHashtagText] = useState(config.hashtags.join(" "));
  const [keywordText, setKeywordText] = useState(config.keywords.join(" "));
  const [importText, setImportText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(exportLensConfig(config));
      setNote("Lens config copied as JSON.");
    } catch {
      setNote("Could not copy — select the JSON below instead.");
    }
  };

  const applyImport = () => {
    try {
      importJson(importText);
      setNote("Imported.");
      setImportText("");
    } catch {
      setNote("That JSON is not a Grow Lens config.");
    }
  };

  return (
    <section
      aria-label="Grow Lens settings"
      className="min-w-0 border-b border-forest-soft/40 bg-forest-deep/40 px-3.5 py-4 sm:px-4"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-cream">Grow Lens</h3>
          <p className="text-[0.7rem] leading-snug text-cream/65">
            Your feed algorithm, in the open. Change it and the feed changes.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Grow Lens settings"
          className="shrink-0 rounded-full border border-forest-soft/60 px-2 py-0.5 text-xs text-cream/70"
        >
          ✕
        </button>
      </header>

      <div className="mt-3 grid gap-3">
        <div>
          <p className="text-[0.7rem] uppercase tracking-wide text-cream/55">Where posts come from</p>
          <div className="mt-1.5 grid gap-1.5">
            {SOURCE_LABELS.map((source) => (
              <label key={source.key} className="flex items-start gap-2 text-xs text-cream/80">
                <input
                  type="checkbox"
                  checked={config.sources[source.key]}
                  onChange={(e) => setSource(source.key, e.target.checked)}
                  className="mt-0.5 accent-current"
                />
                <span className="min-w-0">
                  {source.label}
                  <span className="block text-[0.65rem] text-cream/55">{source.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[0.7rem] uppercase tracking-wide text-cream/55">Signal weights</p>
          <div className="mt-1.5 grid gap-2.5">
            {LENS_SIGNAL_IDS.map((id) => (
              <label key={id} className="block text-xs text-cream/80">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">{SIGNAL_LABELS[id]}</span>
                  <span className="shrink-0 tabular-nums text-cream/60">{config.weights[id]}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={config.weights[id]}
                  onChange={(e) => setWeight(id, Number(e.target.value))}
                  className="mt-1 w-full accent-current"
                />
                <span className="block text-[0.65rem] leading-snug text-cream/55">
                  {SIGNAL_HINTS[id]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-cream/80">
            <span className="flex items-baseline justify-between gap-2">
              Minimum score <span className="tabular-nums text-cream/60">{config.minScore}</span>
            </span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={config.minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-1 w-full accent-current"
            />
          </label>
          <label className="block text-xs text-cream/80">
            <span className="flex items-baseline justify-between gap-2">
              Max posts per author{" "}
              <span className="tabular-nums text-cream/60">{config.maxPerAuthor}</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={config.maxPerAuthor}
              onChange={(e) => setMaxPerAuthor(Number(e.target.value))}
              className="mt-1 w-full accent-current"
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-xs text-cream/80">
          <input
            type="checkbox"
            checked={config.requireTopical}
            onChange={(e) => useLensStore.getState().setRequireTopical(e.target.checked)}
            className="mt-0.5 accent-current"
          />
          <span className="min-w-0">
            Only posts about growing
            <span className="block text-[0.65rem] text-cream/55">
              Even people you follow need a grow word or grow hashtag to appear here.
            </span>
          </span>
        </label>

        <label className="block text-xs text-cream/80">
          Hashtags
          <textarea
            value={hashtagText}
            onChange={(e) => setHashtagText(e.target.value)}
            onBlur={() => setHashtags(tagList(hashtagText))}
            rows={3}
            className="mt-1 w-full resize-y rounded-xl border border-forest-soft/50 bg-forest/50 px-3 py-2 text-xs text-cream"
          />
        </label>

        <label className="block text-xs text-cream/80">
          Extra grow words
          <textarea
            value={keywordText}
            onChange={(e) => setKeywordText(e.target.value)}
            onBlur={() => setKeywords(tagList(keywordText))}
            rows={2}
            placeholder="e.g. terpene mycorrhiza"
            className="mt-1 w-full resize-y rounded-xl border border-forest-soft/50 bg-forest/50 px-3 py-2 text-xs text-cream placeholder:text-cream/40"
          />
        </label>

        <details className="rounded-xl border border-forest-soft/40 bg-forest/40 px-3 py-2">
          <summary className="cursor-pointer text-xs text-cream/75">Share this lens (JSON)</summary>
          <div className="mt-2 grid gap-2">
            <pre className="max-h-40 overflow-auto rounded-lg bg-forest-deep/60 p-2 text-[0.65rem] text-cream/70">
              {exportLensConfig(config)}
            </pre>
            <button
              type="button"
              onClick={() => void copyConfig()}
              className="justify-self-start rounded-full border border-leaf/40 px-3 py-1 text-xs text-leaf"
            >
              Copy JSON
            </button>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={3}
              placeholder="Paste a lens config to import…"
              className="w-full resize-y rounded-xl border border-forest-soft/50 bg-forest/50 px-3 py-2 text-xs text-cream placeholder:text-cream/40"
            />
            <button
              type="button"
              onClick={applyImport}
              disabled={!importText.trim()}
              className="justify-self-start rounded-full border border-forest-soft/60 px-3 py-1 text-xs text-cream/75 disabled:opacity-50"
            >
              Import
            </button>
          </div>
        </details>

        {note ? <p className="text-[0.7rem] text-cream/70">{note}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHashtags(tagList(hashtagText));
              setKeywords(tagList(keywordText));
              onApply();
            }}
            className="rounded-full bg-leaf/20 px-3 py-1.5 text-xs text-leaf"
          >
            Apply to feed
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setHashtagText(useLensStore.getState().config.hashtags.join(" "));
              setKeywordText("");
              setNote("Back to the default lens.");
            }}
            className="rounded-full border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/75"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
