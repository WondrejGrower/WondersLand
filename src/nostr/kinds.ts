// Event kinds shared with Weedoshi. Do not change: both apps read the same data.
export const KIND_PROFILE = 0;
export const KIND_NOTE = 1;
// NIP-02 contact list: who a pubkey follows.
export const KIND_CONTACTS = 3;
export const KIND_DELETE = 5;
export const KIND_GROWMIES = 30000;
export const KIND_DIARY = 30078;

export const DIARY_TAG = "weedoshi-diary";
export const DIARY_TAG_LEGACY = "weedoshi";
export const GROWMIES_D_TAG = "growmies";

// NIP-18 repost / NIP-25 reaction. Read+write, same events every client uses.
export const KIND_REPOST = 6;
export const KIND_REACTION = 7;

// NIP-32 label. Used for public milestone attestations (verified / revoked).
export const KIND_LABEL = 1985;
export const MILESTONE_LABEL_NAMESPACE = "wondersland.milestone";
/** `t` tag that marks a public milestone claim event. */
export const MILESTONE_TAG = "wondersland-milestone";
