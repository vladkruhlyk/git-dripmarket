import { NextResponse } from "next/server";
import { getCachedWooProducts } from "@/lib/woo-products";

export async function GET() {
  try {
    const products = await getCachedWooProducts();
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Product catalog is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
