import { useGardenStore } from "../state/useGardenStore";

/**
 * Minimal owner-only publish control. Visible only for write-capable sessions
 * (NIP-07 or an in-memory nsec signer). No 3D editing UI yet.
 */
export function SaveGarden() {
  const canEdit = useGardenStore((s) => s.canEdit);
  const status = useGardenStore((s) => s.status);
  const dirty = useGardenStore((s) => s.dirty);
  const error = useGardenStore((s) => s.error);
  const save = useGardenStore((s) => s.save);

  if (!canEdit) return null;

  const saving = status === "saving";
  const label =
    status === "error" ? "Error" : saving ? "Saving…" : dirty ? "Unsaved" : "Saved";

  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-full border border-white/15 px-2 py-1 text-[0.7rem] text-white/70"
        title={error ?? undefined}
      >
        {label}
      </span>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-full border border-leaf/50 px-3 py-2 text-xs font-semibold text-leaf disabled:opacity-60 sm:text-sm"
      >
        Save Garden
      </button>
    </div>
  );
}
