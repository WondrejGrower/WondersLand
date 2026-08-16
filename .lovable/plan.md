# Fix the T-pose when the character stops

## What's wrong

The character GLB contains only two animation clips: `Walking` and `Running`. There is no Idle clip.

`CharacterAvatar.tsx` fades the `Walking` weight down to 0 when movement input stops. With no other clip driving the skeleton, the rig snaps back to its unposed bind/T-pose.

## The fix

Never drop the skeleton to zero weight. Instead of fading `Walking` out, keep it at full weight and freeze it on a neutral standing-ish frame when the player stops.

Behaviour:

- Moving: `Walking` plays normally at full weight.
- Stopping: the clip eases its playback speed down to 0 and settles on a chosen neutral frame (a pose where the legs are close together rather than mid-stride), staying at full weight so the rig keeps a real pose.
- Starting again: playback speed eases back up from the frozen frame — no pop, no crossfade artefacts.
- The existing gentle idle bob stays and becomes the only motion while standing.

The `Running` clip stays unused, as agreed.

## Technical notes

- Only `src/world/CharacterAvatar.tsx` changes.
- Keep `Walking` at `setEffectiveWeight(1)` permanently; drive `timeScale` (and, when settling, `action.time`) instead of weight.
- The neutral frame is picked by inspecting the clip duration and using a fraction of it where the stride is closest to a stand; it becomes one named constant in the file.
- All easing happens in refs inside `useFrame` — no allocations, no per-frame `setState`, consistent with the project's performance rules.

## Verification

- Typecheck and dev build.
- Headless browser run: enter the world, walk, stop, confirm the character holds a natural standing pose instead of a T-pose, and that walking resumes smoothly. No console errors.
- Update `PROJECT_STATE.md`, `CHANGELOG.md` and `AI_HANDOFF.md` with the clip inventory (`Walking`, `Running`, no Idle) and this workaround plus its limitation: the standing pose is a frozen walk frame, not a true idle animation.
