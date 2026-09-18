/**
 * One generic interaction pipeline for every interactable: signs, the house,
 * portals, the garden board, diary plants — and later NPCs and quests.
 *
 * click -> requestInteract -> in range? run it : walk to the interaction point
 * and run it on arrival (when auto-interact is on).
 *
 * Nothing here is specific to a single object.
 */
import { useWorldStore } from "../state/useWorldStore";
import { useGardenStore } from "../state/useGardenStore";
import { worldSettings } from "../state/useWorldSettingsStore";
import {
  WORLD_INTERACTABLES as WORLD_LIST,
  getInteractable,
  type WorldInteractable,
} from "./interactables";
import {
  character,
  distanceTo,
  highlightTarget,
  moveTo,
  showMarker,
  type InteractRequest,
} from "./controller/CharacterController";

/** Where the avatar should stand to use this object. */
export function interactionPointOf(it: WorldInteractable): [number, number] {
  return it.interactionPoint ?? it.position;
}

/** How close counts as "in range" for acting on it. */
export function interactionRadiusOf(it: WorldInteractable): number {
  return it.interactionRadius ?? Math.max(1.2, Math.min(it.radius, (it.collider ?? 0.6) + 1.6));
}

/** Plant interactions use one shared reach. */
export const PLANT_INTERACTION_RADIUS = 2.2;

export function targetPoint(req: InteractRequest): [number, number] | null {
  if (req.kind === "world") {
    const it = getInteractable(req.id);
    return it ? interactionPointOf(it) : null;
  }
  const plant = useGardenStore.getState().plants.find((p) => p.id === req.id);
  return plant ? [plant.position[0], plant.position[2]] : null;
}

export function targetRadius(req: InteractRequest): number {
  if (req.kind === "world") {
    const it = getInteractable(req.id);
    return it ? interactionRadiusOf(it) : 1.5;
  }
  return PLANT_INTERACTION_RADIUS;
}

/** Run the action. Called when the avatar is inside the interaction radius. */
export function runInteraction(req: InteractRequest) {
  const store = useWorldStore.getState();
  if (req.kind === "plant") {
    store.setFocusedPlant(req.id);
    store.openJournal();
    return;
  }
  const it = getInteractable(req.id);
  if (!it) return;
  if (it.action === "about") store.openAbout();
  else if (it.action === "indoor") store.openIndoor();
  else if (it.action === "tasks") store.openTasks();
  else if (it.comingSoon) store.openComingSoon(it.comingSoon);
}

/**
 * Click/tap on an interactable. In range it fires immediately; out of range it
 * either walks over (auto-interact) or nudges the player to come closer.
 */
export function requestInteract(req: InteractRequest) {
  const settings = worldSettings();
  const point = targetPoint(req);
  if (!point) return;

  if (settings.controls.objectHighlight) highlightTarget(req.id);

  if (distanceTo(point[0], point[1]) <= targetRadius(req)) {
    character.pending = null;
    runInteraction(req);
    return;
  }

  if (settings.controls.movementMode === "wasd" || !settings.controls.autoInteract) {
    useWorldStore.getState().setHint("Move closer to use this");
    return;
  }

  character.pending = req;
  moveTo(point[0], point[1]);
  if (settings.controls.movementMarker) showMarker(point[0], point[1]);
}

/**
 * Per-frame check for a queued interaction. Cheap: one distance test.
 * Returns true when it fired.
 */
export function tickPendingInteraction(): boolean {
  const req = character.pending;
  if (!req) return false;
  const point = targetPoint(req);
  if (!point) {
    character.pending = null;
    return false;
  }
  if (distanceTo(point[0], point[1]) > targetRadius(req)) return false;
  character.pending = null;
  runInteraction(req);
  return true;
}

/** Nearest clickable thing to a ground point, for raycast-to-interact. */
export function pickInteractableAt(x: number, z: number): InteractRequest | null {
  let best: InteractRequest | null = null;
  let bestScore = 1;
  for (const it of WORLD_LIST) {
    const reach = Math.max(1.0, (it.collider ?? 0.7) + 0.7);
    const score = Math.hypot(it.position[0] - x, it.position[1] - z) / reach;
    if (score < bestScore) {
      bestScore = score;
      best = { kind: "world", id: it.id };
    }
  }
  for (const plant of useGardenStore.getState().plants) {
    const score = Math.hypot(plant.position[0] - x, plant.position[2] - z) / 0.9;
    if (score < bestScore) {
      bestScore = score;
      best = { kind: "plant", id: plant.id };
    }
  }
  return best;
}

