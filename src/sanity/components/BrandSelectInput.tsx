"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { set, unset, useClient, type ReferenceInputProps } from "sanity";
import { apiVersion } from "@/sanity/env";

type BrandOption = {
  _id: string;
  name: string;
};

export function BrandSelectInput(props: ReferenceInputProps) {
  const client = useClient({ apiVersion });
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .fetch<BrandOption[]>(`*[_type == "brand"] | order(name asc){_id, name}`)
      .then(setBrands)
      .finally(() => setLoading(false));
  }, [client]);

  return (
    <div>
      <select
        disabled={loading || props.readOnly}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          const brandId = event.currentTarget.value;
          props.onChange(brandId ? set({ _type: "reference", _ref: brandId }) : unset());
        }}
        style={{
          background: "transparent",
          border: "1px solid var(--card-border-color)",
          borderRadius: 3,
          color: "inherit",
          font: "inherit",
          padding: "12px",
          width: "100%"
        }}
        value={props.value?._ref || ""}
      >
        <option value="">{loading ? "Loading brands..." : "Select brand"}</option>
        {brands.map(brand => (
          <option value={brand._id} key={brand._id}>{brand.name}</option>
        ))}
      </select>
      {props.validation.length > 0 && (
        <p style={{ fontSize: 12, marginBottom: 0 }}>Select a brand before publishing.</p>
      )}
    </div>
  );
}
