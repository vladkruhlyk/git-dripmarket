"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";
import { hasSanityConfig } from "@/sanity/env";

export default function StudioPage() {
  if (!hasSanityConfig) {
    return (
      <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: 32 }}>
        <section style={{ maxWidth: 620 }}>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Connect Sanity Studio</h1>
          <p style={{ lineHeight: 1.6 }}>
            Add <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and <code>NEXT_PUBLIC_SANITY_DATASET</code> to
            your environment, then restart the application. Setup and migration instructions are in the project README.
          </p>
        </section>
      </main>
    );
  }

  return <NextStudio config={config} />;
}
