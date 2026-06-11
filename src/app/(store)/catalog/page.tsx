import { Suspense } from "react";
import { CatalogClient } from "./CatalogClient";

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="page-message">Loading catalog...</div>}>
      <CatalogClient />
    </Suspense>
  );
}
