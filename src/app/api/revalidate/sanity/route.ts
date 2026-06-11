import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.SANITY_REVALIDATE_SECRET || secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid revalidation secret" }, { status: 401 });
  }

  revalidateTag("products");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
