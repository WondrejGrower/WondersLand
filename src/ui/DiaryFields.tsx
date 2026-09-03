// Reusable pickers for the diary composer. UI only — every control writes back
// the exact same plain strings the Weedoshi write path already stores.
import { useMemo, useState } from "react";
import { plantCatalogData } from "../nostr/plants/catalogData";
import { categorizePlant, type PlantCategory } from "../garden/categories";
import type { PlantCatalogItem } from "../nostr/plants/types";

const chip =
  "min-h-9 rounded-full border px-3 py-1.5 text-xs transition-colors";
const chipOn = "border-leaf bg-leaf text-forest-deep font-semibold";
const chipOff = "border-forest-soft/60 bg-forest-deep/40 text-cream/75";

export const fieldClass =
  "w-full min-w-0 min-h-11 rounded-xl border border-forest-soft/60 bg-forest-deep/60 px-3 py-2.5 text-base text-cream placeholder:text-cream/40 outline-none focus:border-leaf/70 sm:text-sm";

export const labelClass = "text-[0.7rem] uppercase tracking-wide text-cream/60";

/* ------------------------------------------------------------------ plants */

/**
 * Temporary scope limit: only cannabis is offered while the client is being
 * tested. Flip this to false to bring the whole catalog back.
 */
const CANNABIS_ONLY = true;

/** Hand-written cannabis options — the shape growers actually pick from. */
const CANNABIS_OPTIONS = [
  "Cannabis ruderalis",
  "Cannabis indica dominant",
  "Cannabis sativa dominant",
  "Cannabis hybrid",
  "Cannabis sativa L.",
  "Cannabis indica",
  "Cannabis sativa",
];

const CATEGORIES: Array<{ id: PlantCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "cannabis", label: "Cannabis" },
  { id: "vegetable", label: "Vegetables" },
  { id: "herb", label: "Herbs" },
  { id: "fruit", label: "Fruit" },
  { id: "indoor", label: "Indoor plants" },
  { id: "other", label: "Other" },
];


/** Category of a catalog item, derived through the one existing classifier. */
function categoryOf(item: PlantCatalogItem): PlantCategory {
  return categorizePlant({ plantSlug: item.id, species: item.latin, plant: item.common[0] });
}

function matches(item: PlantCatalogItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.latin.toLowerCase().includes(q) ||
    item.common.some((c) => c.toLowerCase().includes(q)) ||
    item.syn.some((s) => s.toLowerCase().includes(q))
  );
}

function label(item: PlantCatalogItem): string {
  const common = item.common[0];
  return common ? `${common} — ${item.latin}` : item.latin;
}

export function PlantPicker({
  value,
  onChange,
}: {
  /** Free text exactly as it is stored on the diary. */
  value: string;
  onChange: (plant: string) => void;
}) {
  const [category, setCategory] = useState<PlantCategory | "all">("all");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    let items = plantCatalogData.items;
    if (category !== "all") items = items.filter((item) => categoryOf(item) === category);
    if (q) items = items.filter((item) => matches(item, q));
    return items.slice(0, 24);
  }, [category, query]);

  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`${chip} ${category === c.id ? chipOn : chipOff}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search plants…"
        aria-label="Search plants"
        className={fieldClass}
      />

      <div className="max-h-44 min-w-0 overflow-y-auto rounded-xl border border-forest-soft/40">
        {results.length === 0 ? (
          <p className="p-3 text-xs text-cream/60">
            Nothing in the catalog matches. Type your own plant name below.
          </p>
        ) : (
          <ul className="divide-y divide-forest-soft/30">
            {results.map((item) => {
              const text = label(item);
              const selected = value.trim().toLowerCase() === text.toLowerCase();
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onChange(text)}
                    className={`w-full min-h-11 truncate px-3 py-2.5 text-left text-sm ${
                      selected ? "bg-leaf/15 text-leaf" : "text-cream/85"
                    }`}
                  >
                    {text}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or type any plant, e.g. Cannabis sativa L."
        aria-label="Plant or species"
        className={fieldClass}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ phases */

export const PHASE_PRESETS = [
  "Germination",
  "Seedling",
  "Vegetative",
  "Flowering",
  "Harvested",
  "Drying",
  "Curing",
  "Finished",
] as const;

export function PhaseChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (phase: string) => void;
}) {
  const known = PHASE_PRESETS.some((p) => p.toLowerCase() === value.trim().toLowerCase());
  const [custom, setCustom] = useState(Boolean(value) && !known);

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {PHASE_PRESETS.map((p) => {
          const on = !custom && value.trim().toLowerCase() === p.toLowerCase();
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setCustom(false);
                onChange(on ? "" : p);
              }}
              className={`${chip} ${on ? chipOn : chipOff}`}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom((c) => !c)}
          className={`${chip} ${custom ? chipOn : chipOff}`}
        >
          Other
        </button>
      </div>
      {custom ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe the phase"
          aria-label="Custom phase"
          className={fieldClass}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------- recent free text */

export function SuggestInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Values the user already used in their own diaries. */
  suggestions: string[];
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
      {suggestions.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`${chip} ${value.trim() === s ? chipOn : chipOff} max-w-full truncate`}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
