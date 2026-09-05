import "server-only";

type SupabaseRequestInit = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  prefer?: string;
};

type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error("Supabase env vars are not configured");
  }

  return {
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
    serviceKey
  };
}

export async function supabaseRequest<T>(path: string, init: SupabaseRequestInit = {}) {
  const { restUrl, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${restUrl}${path}`, {
    method: init.method || "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {})
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as SupabaseError | null;
    throw new Error(payload?.message || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}
