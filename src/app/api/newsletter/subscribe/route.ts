import { NextRequest, NextResponse } from "next/server";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sanityWriteClient = createClient({
  apiVersion,
  dataset,
  projectId: projectId || "missing-project-id",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = (body?.email || "").trim().toLowerCase().slice(0, 120);

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: "Subscriptions are not configured yet" }, { status: 503 });
  }

  try {
    const existing = await sanityWriteClient.fetch<string | null>(
      `*[_type == "subscriber" && email == $email][0]._id`,
      { email }
    );

    if (!existing) {
      await sanityWriteClient.create({
        _type: "subscriber",
        email,
        subscribedAt: new Date().toISOString(),
        source: "footer"
      });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not subscribe right now. Try again later." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
