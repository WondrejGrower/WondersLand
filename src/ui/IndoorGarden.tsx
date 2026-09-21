import { useEffect, useMemo, useRef, useState } from "react";
import { activityHistory, diaryHistory, type DiaryHistoryItem } from "../features/history";
import { useTasksStore } from "../features/tasks/useTasksStore";
import { categorizePlant } from "../garden/categories";
import { firstImage } from "../nostr/media";
import type { Diary } from "../nostr/types";
import { useNostrStore } from "../state/useNostrStore";
import { useWorldStore } from "../state/useWorldStore";

type Tab = "plants" | "diaries" | "activity";

function formatDate(secondsOrMs: number): string {
  const milliseconds = secondsOrMs < 10_000_000_000 ? secondsOrMs * 1000 : secondsOrMs;
  return new Date(milliseconds).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function IndoorGarden() {
  const open = useWorldStore((state) => state.indoorOpen);
  const close = useWorldStore((state) => state.closeIndoor);
  const diaries = useNostrStore((state) => state.diaries);
  const profile = useNostrStore((state) => state.profile);
  const pubkey = useNostrStore((state) => state.pubkey);
  const board = useTasksStore((state) => state.board);
  const logs = useTasksStore((state) => state.logs);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>("plants");
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryHistoryItem | null>(null);

  const indoor = useMemo(
    () =>
      diaries.filter(
        (diary) =>
          categorizePlant({
            plantSlug: diary.plantSlug,
            plant: diary.plant,
            species: diary.species,
            title: diary.title,
          }) === "indoor",
      ),
    [diaries],
  );
  const diaryItems = useMemo(() => diaryHistory(diaries), [diaries]);
  const activityItems = useMemo(() => activityHistory(board, logs), [board, logs]);

  useEffect(() => {
    if (open && pubkey) void useTasksStore.getState().init(pubkey);
  }, [open, pubkey]);

  useEffect(() => {
    if (!open) {
      setTab("plants");
      setSelectedDiary(null);
      setSelectedEntry(null);
      return;
    }
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (selectedDiary) setSelectedDiary(null);
      else if (selectedEntry) setSelectedEntry(null);
      else close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close, selectedDiary, selectedEntry]);

  if (!open) return null;

  const name = profile?.display_name || profile?.name || "Your garden";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/40 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-7 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2 id="house-title" className="truncate text-xl font-semibold sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              My Garden House
            </h2>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{name} · personal archive</p>
          </div>
          <button ref={closeRef} type="button" onClick={close} aria-label="Close garden house" className="shrink-0 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="hidden sm:inline">Esc</span><span className="sm:hidden">✕</span>
          </button>
        </header>

        <div role="tablist" aria-label="Garden house sections" className="grid grid-cols-3 border-b border-border bg-secondary/40 p-1">
          {(["plants", "diaries", "activity"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => { setTab(item); setSelectedDiary(null); setSelectedEntry(null); }}
              className={`min-w-0 px-2 py-2.5 text-xs font-semibold capitalize sm:text-sm ${tab === item ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {item === "diaries" ? "Diary history" : item === "activity" ? "Activity" : "Plants"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
          {tab === "plants" ? (
            selectedDiary ? <DiaryDetail diary={selectedDiary} onBack={() => setSelectedDiary(null)} /> : <PlantsList diaries={indoor} onSelect={setSelectedDiary} />
          ) : tab === "diaries" ? (
            selectedEntry ? <EntryDetail value={selectedEntry} onBack={() => setSelectedEntry(null)} /> : <DiaryTimeline items={diaryItems} onSelect={setSelectedEntry} />
          ) : (
            <ActivityTimeline items={activityItems} />
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-14 text-center text-sm text-muted-foreground">{children}</p>;
}

function PlantsList({ diaries, onSelect }: { diaries: Diary[]; onSelect: (diary: Diary) => void }) {
  if (diaries.length === 0) return <Empty>No indoor plants in this garden yet.</Empty>;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {diaries.map((diary) => (
        <li key={diary.id}>
          <button type="button" onClick={() => onSelect(diary)} className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {diary.coverImage ? <img src={diary.coverImage} alt="" loading="lazy" className="h-28 w-full object-cover" /> : <div className="h-28 w-full bg-secondary" aria-hidden />}
            <span className="p-3"><span className="block truncate text-sm font-semibold">{diary.plant || diary.title}</span><span className="mt-1 block text-xs text-muted-foreground">{diary.items.length} entries</span></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DiaryTimeline({ items, onSelect }: { items: DiaryHistoryItem[]; onSelect: (item: DiaryHistoryItem) => void }) {
  if (items.length === 0) return <Empty>No diary history yet.</Empty>;
  return (
    <ul className="space-y-3">
      {items.map((value) => (
        <li key={value.id}>
          <button type="button" onClick={() => onSelect(value)} className="flex w-full gap-3 rounded-xl border border-border bg-background p-3 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {firstImage(value.item) ? <img src={firstImage(value.item)} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-16 shrink-0 rounded-lg bg-secondary" aria-hidden />}
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{value.plantName}</span><span className="block truncate text-xs text-muted-foreground">{value.diaryTitle} · {formatDate(value.item.createdAt)}</span>{value.item.contentPreview ? <span className="mt-1 line-clamp-2 block text-sm">{value.item.contentPreview}</span> : null}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ActivityTimeline({ items }: { items: ReturnType<typeof activityHistory> }) {
  if (items.length === 0) return <Empty>No completed activity yet.</Empty>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="border-l-2 border-primary/40 py-1 pl-3">
          <p className="text-xs text-muted-foreground">{formatDate(item.occurredAt)} · {item.detail}</p>
          <p className="mt-1 break-words text-sm font-semibold">{item.title}</p>
        </li>
      ))}
    </ul>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← {children}</button>;
}

function EntryDetail({ value, onBack }: { value: DiaryHistoryItem; onBack: () => void }) {
  const image = firstImage(value.item);
  return (
    <article>
      <BackButton onClick={onBack}>Diary history</BackButton>
      <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{formatDate(value.item.createdAt)}{value.item.phaseLabel ? ` · ${value.item.phaseLabel}` : ""}</p>
      <h3 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>{value.plantName}</h3>
      <p className="text-sm text-muted-foreground">{value.diaryTitle}</p>
      {image ? <img src={image} alt="" className="mt-4 max-h-80 w-full rounded-lg object-cover" /> : null}
      {value.item.contentPreview ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{value.item.contentPreview}</p> : <Empty>This entry has no text preview.</Empty>}
    </article>
  );
}

function DiaryDetail({ diary, onBack }: { diary: Diary; onBack: () => void }) {
  return (
    <article>
      <BackButton onClick={onBack}>All indoor plants</BackButton>
      <h3 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>{diary.title}</h3>
      {diary.species || diary.cultivar ? <p className="mt-1 text-sm italic text-muted-foreground">{diary.species ?? diary.cultivar}</p> : null}
      <h4 className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Grow log · {diary.items.length} entries</h4>
      {diary.items.length === 0 ? <Empty>This diary has no entries on the connected relays yet.</Empty> : (
        <ul className="mt-3 space-y-4">
          {[...diary.items].reverse().map((item) => {
            const image = firstImage(item);
            return <li key={item.eventId} className="border-l-2 border-primary/40 pl-3"><p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}{item.phaseLabel ? ` · ${item.phaseLabel}` : ""}</p>{image ? <img src={image} alt="" loading="lazy" className="mt-2 max-h-64 w-full rounded-lg object-cover" /> : null}{item.contentPreview ? <p className="mt-2 text-sm leading-relaxed">{item.contentPreview}</p> : null}</li>;
          })}
        </ul>
      )}
    </article>
  );
}