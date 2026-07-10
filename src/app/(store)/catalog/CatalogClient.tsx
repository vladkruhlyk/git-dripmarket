"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/context/ProductsContext";

type SortKey = "newest" | "price-asc" | "price-desc";
type AvailabilityKey = "all" | "in-stock" | "pre-order";

const SORT_KEYS: SortKey[] = ["newest", "price-asc", "price-desc"];

function readSortParam(value: string | null): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? value as SortKey : "newest";
}

function readAvailabilityParam(value: string | null): AvailabilityKey {
  if (value === "1" || value === "true" || value === "in-stock") return "in-stock";
  if (value === "0" || value === "false" || value === "pre-order") return "pre-order";
  return "all";
}

function readBrandParams(searchParams: { getAll: (name: string) => string[] }) {
  return [...new Set(searchParams.getAll("brand").filter(Boolean))];
}

export function CatalogClient() {
  const { products, loading, error } = useProducts();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const pathname = usePathname();
  const router = useRouter();
  const [category, setCategory] = useState(params.get("category") || "all");
  const [brands, setBrands] = useState<string[]>(readBrandParams(params));
  const [sort, setSort] = useState<SortKey>(readSortParam(params.get("sort")));
  const [availability, setAvailability] = useState<AvailabilityKey>(readAvailabilityParam(params.get("stock")));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const gender = params.get("gender");
  const sale = params.get("sale");

  const categories = useMemo(() => [...new Set(products.map(product => product.category).filter(Boolean))].sort(), [products]);
  const brandOptions = useMemo(() => [...new Set(products.map(product => product.brand))].sort(), [products]);
  const availableBrands = useMemo(() => {
    let result = [...products];

    if (gender) result = result.filter(product => product.gender === gender || product.gender === "Unisex");
    if (sale) result = result.filter(product => product.salePrice);
    if (availability === "in-stock") result = result.filter(product => product.inStock);
    if (availability === "pre-order") result = result.filter(product => !product.inStock);
    if (category !== "all") result = result.filter(product => product.category === category);

    return [...new Set(result.map(product => product.brand))].sort();
  }, [products, gender, sale, availability, category]);

  useEffect(() => {
    const currentParams = new URLSearchParams(paramsKey);
    setCategory(currentParams.get("category") || "all");
    setBrands(readBrandParams(currentParams));
    setSort(readSortParam(currentParams.get("sort")));
    setAvailability(readAvailabilityParam(currentParams.get("stock")));
  }, [paramsKey]);

  const syncUrl = useCallback((next: { category?: string; brands?: string[]; sort?: SortKey; availability?: AvailabilityKey }) => {
    const nextCategory = next.category ?? category;
    const nextBrands = next.brands ?? brands;
    const nextSort = next.sort ?? sort;
    const nextAvailability = next.availability ?? availability;
    const nextParams = new URLSearchParams(paramsKey);

    if (nextCategory === "all") {
      nextParams.delete("category");
    } else {
      nextParams.set("category", nextCategory);
    }

    nextParams.delete("brand");
    nextBrands.forEach(brand => nextParams.append("brand", brand));

    if (nextSort === "newest") {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", nextSort);
    }

    if (nextAvailability === "all") {
      nextParams.delete("stock");
    } else {
      nextParams.set("stock", nextAvailability === "in-stock" ? "1" : "0");
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [availability, brands, category, paramsKey, pathname, router, sort]);

  useEffect(() => {
    if (loading) return;
    const nextBrands = brands.filter(brand => availableBrands.includes(brand));
    if (nextBrands.length === brands.length) return;

    setBrands(nextBrands);
    syncUrl({ brands: nextBrands });
  }, [availableBrands, brands, loading, syncUrl]);

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setFiltersOpen(false);
    syncUrl({ category: nextCategory });
  }

  function selectAvailability(nextAvailability: AvailabilityKey) {
    setAvailability(nextAvailability);
    syncUrl({ availability: nextAvailability });
  }

  const filtered = useMemo(() => {
    let result = [...products];

    if (gender) result = result.filter(product => product.gender === gender || product.gender === "Unisex");
    if (sale) result = result.filter(product => product.salePrice);
    if (availability === "in-stock") result = result.filter(product => product.inStock);
    if (availability === "pre-order") result = result.filter(product => !product.inStock);
    if (category !== "all") result = result.filter(product => product.category === category);
    if (brands.length) result = result.filter(product => brands.includes(product.brand));

    if (sort === "price-asc") result.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    if (sort === "price-desc") result.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    if (sort === "newest") result.sort((a, b) => Number(b.isNew) - Number(a.isNew));

    return result;
  }, [products, gender, sale, availability, category, brands, sort]);

  function toggleBrand(brand: string) {
    if (!availableBrands.includes(brand)) return;
    const nextBrands = brands.includes(brand) ? brands.filter(item => item !== brand) : [...brands, brand];
    setBrands(nextBrands);
    syncUrl({ brands: nextBrands });
  }

  function selectSort(nextSort: SortKey) {
    setSort(nextSort);
    setSortOpen(false);
    syncUrl({ sort: nextSort });
  }

  function toggleFilters() {
    setFiltersOpen(open => {
      if (!open) setSortOpen(false);
      return !open;
    });
  }

  function toggleSort() {
    setSortOpen(open => {
      if (!open) setFiltersOpen(false);
      return !open;
    });
  }

  return (
    <>
      <div className="mobile-controls">
        <button className={`mobile-controls__btn ${filtersOpen ? "active" : ""}`} type="button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={toggleFilters}>
          {filtersOpen ? "Close Filters" : "Filters"}
        </button>
        <button className={`mobile-controls__btn ${sortOpen ? "active" : ""}`} type="button" aria-expanded={sortOpen} aria-controls="catalog-sort" onClick={toggleSort}>
          {sortOpen ? "Close Sort" : "Sort"}
        </button>
      </div>

      <div className="catalog">
        <aside id="catalog-filters" className={`catalog__filters ${filtersOpen ? "open" : ""}`}>
          <div className="filter-section">
            <div className="filter-section__title">Categories</div>
            <button className={`filter-link ${category === "all" ? "active" : ""}`} type="button" onClick={() => selectCategory("all")}>All</button>
            {categories.map(option => (
              <button className={`filter-link ${category === option ? "active" : ""}`} key={option} type="button" onClick={() => selectCategory(option)}>
                {option}
              </button>
            ))}
          </div>
          <div className="filter-section">
            <div className="filter-section__title">Availability</div>
            <button className={`filter-link ${availability === "all" ? "active" : ""}`} type="button" onClick={() => selectAvailability("all")}>All</button>
            <button className={`filter-link ${availability === "in-stock" ? "active" : ""}`} type="button" onClick={() => selectAvailability("in-stock")}>In Stock</button>
            <button className={`filter-link ${availability === "pre-order" ? "active" : ""}`} type="button" onClick={() => selectAvailability("pre-order")}>Pre-order</button>
          </div>
          <div className="filter-section">
            <div className="filter-section__title">Designers</div>
            <div className="designers-list">
              {brandOptions.map(option => (
                <button
                  className={`filter-link ${brands.includes(option) ? "active" : ""}`}
                  disabled={!availableBrands.includes(option)}
                  key={option}
                  type="button"
                  onClick={() => toggleBrand(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="catalog__main">
          <div className="product-grid">
            {loading && <div className="product-grid--empty">Loading products...</div>}
            {!loading && error && <div className="product-grid--empty">{error}</div>}
            {!loading && !error && filtered.length === 0 && <div className="product-grid--empty">No products found</div>}
            {filtered.map((product, index) => (
              <ProductCard product={product} key={product.id} delay={index * 0.02} />
            ))}
          </div>
        </section>

        <aside id="catalog-sort" className={`catalog__sort ${sortOpen ? "open" : ""}`}>
          <div className="sort-section">
            <div className="sort-section__title">Sort</div>
            <button className={`sort-link ${sort === "newest" ? "active" : ""}`} type="button" onClick={() => selectSort("newest")}>Latest Arrivals</button>
            <button className={`sort-link ${sort === "price-asc" ? "active" : ""}`} type="button" onClick={() => selectSort("price-asc")}>Price: Low to high</button>
            <button className={`sort-link ${sort === "price-desc" ? "active" : ""}`} type="button" onClick={() => selectSort("price-desc")}>Price: High to low</button>
          </div>
        </aside>
      </div>
    </>
  );
}
