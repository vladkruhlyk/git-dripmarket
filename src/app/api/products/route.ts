import { NextResponse } from "next/server";
import { getProducts } from "@/sanity/queries";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
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
