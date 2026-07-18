import { NextRequest, NextResponse } from "next/server";

type NovaPoshtaWarehouse = {
  CategoryOfWarehouse?: string;
  Description?: string;
  DescriptionRu?: string;
  Number?: string;
  Ref?: string;
  ShortAddress?: string;
  TypeOfWarehouse?: string;
};

const NOVA_POSHTA_API_URL = "https://api.novaposhta.ua/v2.0/json/";

function normalizeQuery(value: string | null, maxLength = 120) {
  return (value || "").trim().slice(0, maxLength);
}

function warehouseKind(warehouse: NovaPoshtaWarehouse) {
  const text = `${warehouse.CategoryOfWarehouse || ""} ${warehouse.TypeOfWarehouse || ""} ${warehouse.Description || ""}`.toLowerCase();
  if (/postomat|поштомат|почтомат|parcel/.test(text)) return "Parcel locker";
  return "Branch";
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  const cityRef = normalizeQuery(request.nextUrl.searchParams.get("cityRef"));
  const query = normalizeQuery(request.nextUrl.searchParams.get("q"));

  if (!apiKey) {
    return NextResponse.json({ error: "Nova Poshta API key is not configured", warehouses: [] }, { status: 503 });
  }

  if (!cityRef) {
    return NextResponse.json({ warehouses: [] });
  }

  const response = await fetch(NOVA_POSHTA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      modelName: "Address",
      calledMethod: "getWarehouses",
      methodProperties: {
        CityRef: cityRef,
        FindByString: query,
        Limit: "50",
        Page: "1"
      }
    }),
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Nova Poshta warehouse search failed", warehouses: [] }, { status: 502 });
  }

  const payload = await response.json() as {
    data?: NovaPoshtaWarehouse[];
    success?: boolean;
  };

  const warehouses = (payload.data || [])
    .filter(warehouse => warehouse.Ref && (warehouse.Description || warehouse.DescriptionRu))
    .map(warehouse => ({
      ref: warehouse.Ref,
      number: warehouse.Number || "",
      label: warehouse.Description || warehouse.DescriptionRu,
      address: warehouse.ShortAddress || "",
      kind: warehouseKind(warehouse)
    }));

  return NextResponse.json({ warehouses });
}
