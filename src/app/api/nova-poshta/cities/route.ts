import { NextRequest, NextResponse } from "next/server";

type NovaPoshtaCity = {
  Area?: string;
  DeliveryCity?: string;
  MainDescription?: string;
  Present?: string;
  Ref?: string;
  Region?: string;
};

const NOVA_POSHTA_API_URL = "https://api.novaposhta.ua/v2.0/json/";

function normalizeQuery(value: string | null) {
  return (value || "").trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  const query = normalizeQuery(request.nextUrl.searchParams.get("q"));

  if (!apiKey) {
    return NextResponse.json({ error: "Nova Poshta API key is not configured", cities: [] }, { status: 503 });
  }

  if (query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  const response = await fetch(NOVA_POSHTA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      modelName: "Address",
      calledMethod: "searchSettlements",
      methodProperties: {
        CityName: query,
        Limit: "20",
        Page: "1"
      }
    }),
    next: { revalidate: 60 * 60 * 24 }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Nova Poshta city search failed", cities: [] }, { status: 502 });
  }

  const payload = await response.json() as {
    data?: Array<{ Addresses?: NovaPoshtaCity[] }>;
    success?: boolean;
  };

  const cities = (payload.data?.[0]?.Addresses || [])
    .filter(city => city.DeliveryCity && (city.Present || city.MainDescription))
    .map(city => ({
      ref: city.DeliveryCity || city.Ref,
      label: city.Present || city.MainDescription,
      name: city.MainDescription || city.Present,
      area: city.Area || "",
      region: city.Region || ""
    }));

  return NextResponse.json({ cities });
}
