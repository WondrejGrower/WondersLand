# NoTillMan handoff

Read AGENTS.md and PROJECT_STATE.md first. The current product is a personal
NoTillMan botanical link hub. The user rejected the first image-only version as
stuttering and asked for real 3D, referencing the JS Mastery React/Three.js/GSAP
MacBook landing tutorial: https://youtu.be/DEeaT6FxEws . That supersedes all earlier
CSS/image-only instructions. The archived WondersLand world stays separate.

The complete cleaned old project is preserved on branch
`backup/wondersland-nostr-2026-11-02`, commit
`6ca4b6bbbd59f4ee96f5be82c805d7e9027629d1`. Never change that archive or
reintroduce the deleted game. Do not purge browser/Nostr data or force push.

The active feature is `src/features/creator-hub/`. Its lazy imperative Three.js
scene has a single volumetric plant, ascending perspective camera and horizontal
rotation. Scroll remains native and starts at the bottom. The demand loop sleeps
at rest; React updates chapters only. Projected leaf/flower anchors follow the 3D
model. Keep geometry and drawing-buffer budgets bounded and dispose resources,
RAF, observers and listeners on unmount. Reduced motion snaps camera/jumps.

The stage MUST stay fixed within the native scroll region, with overflow:clip.
Sticky positioning made the browser move scrollTop when focusing rotation
controls. Chapter buttons retain explicit aria-labels even when text is hidden.
Do not read DOM layout in the per-frame callback; it receives viewport width.
Pointer input is attached to the native scroll region; fixed scene layers are
pointer-transparent. Preserve this so wheel/touch scrolling remains native.
The no-WebGL renderer preserves actual perspective 3D at lower geometry detail;
the WebP is only a last-resort poster. No old Canvas/world code is imported.

Affiliate destinations are in links.ts; both affiliateUrl values remain null.
Ordinary official links are honest fallbacks, not commission-earning referrals.
The public Instagram/Nostr links and NIP-05 endpoint remain. No new backend,
accounts, tracking or autoplay audio. No production deployment until requested.

Lovable credits were still exhausted at the last request. Normal GitHub main
commits sync to this same Lovable project. Do not pretend a rejected build-agent
request edited anything. See PROJECT_STATE.md for checks and the WebGL QA limit.
