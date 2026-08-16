const IMAGE_RE = /(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|avif))(?:\?[^\s"'<>]*)?/gi;

export function extractImageUrls(content: string): string[] {
  const urls = content.match(IMAGE_RE);
  return urls ? [...new Set(urls)] : [];
}

export function firstImage(item: { image?: string | undefined; mediaUrls?: string[] | undefined }): string | undefined {
  if (item.image) return item.image;
  return item.mediaUrls?.[0];
}

export function preview(content: string, max = 180): string {
  const stripped = content.replace(IMAGE_RE, "").replace(/\s+/g, " ").trim();
  return stripped.length > max ? `${stripped.slice(0, max - 1)}…` : stripped;
}
