import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IMAGE_HOSTS = new Set(["cms.dripmarketua.store"]);
const ONE_DAY = 60 * 60 * 24;

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "Missing image source" }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid image source" }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(imageUrl.hostname)) {
    return NextResponse.json({ error: "Image source is not allowed" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(imageUrl, {
      next: { revalidate: ONE_DAY }
    });
  } catch {
    return NextResponse.json({ error: "Image could not be loaded" }, { status: 502 });
  }

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Image could not be loaded" }, { status: response.status || 502 });
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Source is not an image" }, { status: 415 });
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": `public, max-age=${ONE_DAY}, s-maxage=${ONE_DAY}, stale-while-revalidate=${ONE_DAY}`,
      "Content-Type": contentType
    }
  });
}
