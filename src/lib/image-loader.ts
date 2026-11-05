// Vercel's image optimizer is a paid quota (it returns 402 once used up), so images are resized elsewhere:
// Sanity photos by Sanity's own CDN, local /public files are served as they are.
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://cdn.sanity.io/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality || 75));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    return url.toString();
  }
  // The width param keeps next/image's responsive srcset valid; static files ignore it.
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
