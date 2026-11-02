/** Supply the real personal affiliate URLs here when Wondrej provides them. */
export const PARTNERS = {
  fastbuds: {
    name: "FastBuds",
    affiliateUrl: null as string | null,
    officialUrl: "https://2fast4buds.com/",
  },
  higgsfield: {
    name: "Higgsfield",
    affiliateUrl: null as string | null,
    officialUrl: "https://higgsfield.ai/",
  },
};
export type Partner = keyof typeof PARTNERS;
export const SOCIAL = {
  instagram: "https://www.instagram.com/notill.man/",
  nostr: "https://njump.me/npub1c0cj4x59hm4yd6nrrj2k22shuqknhjlyw773wzf4pushupkzzvqsjelp5x",
};
export function partnerLink(id: Partner) {
  const entry = PARTNERS[id],
    affiliate = entry.affiliateUrl?.trim();
  return {
    href: affiliate || entry.officialUrl,
    rel: affiliate ? "noopener noreferrer sponsored" : "noopener noreferrer",
    isAffiliate: Boolean(affiliate),
  };
}
