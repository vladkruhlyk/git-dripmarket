import { NextResponse } from "next/server";
import { fetchWooProducts } from "@/lib/products";

export async function GET() {
  try {
    const products = await fetchWooProducts();
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json([], { status: 200 });
  }
}
