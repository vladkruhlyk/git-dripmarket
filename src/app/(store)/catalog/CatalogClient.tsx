"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/context/ProductsContext";

type SortKey = "newest" | "price-asc" | "price-desc";
type AvailabilityKey = "all" | "in-stock" | "pre-order";

const SORT_KEYS: SortKey[] = ["newest", "price-asc", "price-desc"];
const PAGE_SIZE = 48;
const MAX_STAGGER_INDEX = 12;

function readSortParam(value: string | null): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? value as SortKey : "newest";
}

function readAvailabilityParam(value: string | null): AvailabilityKey {
  if (value === "1" || value === "true" || value === "in-stock") return "in-stock";
  if (value === "0" || value === "false" || value === "pre-order") return "pre-order";
  return "all";
}

function readListParams(searchParams: { getAll: (name: string) => string[] }, name: string) {
  return [...new Set(searchParams.getAll(name).filter(Boolean))];
}

export function CatalogClient() {
  const { products, loading, error } = useProducts();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const pathname = usePathname();
  const router = useRouter();
  const [category, setCategory] = useState(params.get("category") || "all");
  const [brands, setBrands] = useState<string[]>(readListParams(params, "brand"));
  const [models, setModels] = useState<string[]>(readListParams(params, "model"));
  const [sort, setSort] = useState<SortKey>(readSortParam(params.get("sort")));
  const [availability, setAvailability] = useState<AvailabilityKey>(readAvailabilityParam(params.get("stock")));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const gender = params.get("gender");
  const sale = params.get("sale");

  const categories = useMemo(() => [...new Set(products.map(product => product.category).filter(Boolean))].sort(), [products]);
  const brandOptions = useMemo(() => [...new Set(products.map(product => product.brand))].sort(), [products]);

  const baseFiltered = useMemo(() => {
    let result = [...products];

    if (gender) result = result.filter(product => product.gender === gender || product.gender === "Unisex");
    if (sale) result = result.filter(product => product.salePrice);
    if (availability === "in-stock") result = result.filter(product => product.inStock);
    if (availability === "pre-order") result = result.filter(product => !product.inStock);
    if (category !== "all") result = result.filter(product => product.category === category);

    return result;
  }, [products, gender, sale, availability, category]);

  const availableBrands = useMemo(() => (
    [...new Set(baseFiltered.map(product => product.brand))].sort()
  ), [baseFiltered]);

  // brand -> model -> number of catalog items under the current base filters
  const modelsByBrand = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    baseFiltered.forEach(product => {
      if (!product.name) return;
      const brandModels = map.get(product.brand) || new Map<string, number>();
      brandModels.set(product.name, (brandModels.get(product.name) || 0) + 1);
      map.set(product.brand, brandModels);
    });
    return map;
  }, [baseFiltered]);

  const availableModels = useMemo(() => {
    const set = new Set<string>();
    brands.forEach(brand => {
      const brandModels = modelsByBrand.get(brand);
      if (brandModels) brandModels.forEach((_, model) => set.add(model));
    });
    return set;
  }, [brands, modelsByBrand]);

  useEffect(() => {
    const currentParams = new URLSearchParams(paramsKey);
    setCategory(currentParams.get("category") || "all");
    setBrands(readListParams(currentParams, "brand"));
    setModels(readListParams(currentParams, "model"));
    setSort(readSortParam(currentParams.get("sort")));
    setAvailability(readAvailabilityParam(currentParams.get("stock")));
  }, [paramsKey]);

  const syncUrl = useCallback((next: {
    category?: string;
    brands?: string[];
    models?: string[];
    sort?: SortKey;
    availability?: AvailabilityKey;
    gender?: string | null;
    sale?: string | null;
  }) => {
    const nextCategory = next.category ?? category;
    const nextBrands = next.brands ?? brands;
    const nextModels = next.models ?? models;
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

    nextParams.delete("model");
    nextModels.forEach(model => nextParams.append("model", model));

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

    if (next.gender !== undefined) {
      if (next.gender) {
        nextParams.set("gender", next.gender);
      } else {
        nextParams.delete("gender");
      }
    }

    if (next.sale !== undefined) {
      if (next.sale) {
        nextParams.set("sale", next.sale);
      } else {
        nextParams.delete("sale");
      }
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [availability, brands, category, models, paramsKey, pathname, router, sort]);

  useEffect(() => {
    if (loading) return;
    const nextBrands = brands.filter(brand => availableBrands.includes(brand));
    if (nextBrands.length === brands.length) return;

    setBrands(nextBrands);
    syncUrl({ brands: nextBrands });
  }, [availableBrands, brands, loading, syncUrl]);

  useEffect(() => {
    if (loading) return;
    const nextModels = models.filter(model => availableModels.has(model));
    if (nextModels.length === models.length) return;

    setModels(nextModels);
    syncUrl({ models: nextModels });
  }, [availableModels, loading, models, syncUrl]);

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setFiltersOpen(false);
    syncUrl({ category: nextCategory });
  }

  function selectAvailability(nextAvailability: AvailabilityKey) {
    setAvailability(nextAvailability);
    syncUrl({ availability: nextAvailability });
  }

  // For every selected brand: the models picked inside that brand.
  // An empty set means the whole brand stays visible.
  const modelSelectionByBrand = useMemo(() => {
    const map = new Map<string, Set<string>>();
    brands.forEach(brand => {
      const brandModels = modelsByBrand.get(brand);
      if (!brandModels) return;
      map.set(brand, new Set(models.filter(model => brandModels.has(model))));
    });
    return map;
  }, [brands, models, modelsByBrand]);

  const filtered = useMemo(() => {
    let result = [...baseFiltered];

    if (brands.length) result = result.filter(product => brands.includes(product.brand));
    if (models.length) {
      result = result.filter(product => {
        const selectedModels = modelSelectionByBrand.get(product.brand);
        return !selectedModels || selectedModels.size === 0 || selectedModels.has(product.name);
      });
    }

    if (sort === "price-asc") result.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    if (sort === "price-desc") result.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    if (sort === "newest") result.sort((a, b) => Number(b.isNew) - Number(a.isNew));

    return result;
  }, [baseFiltered, brands, models, modelSelectionByBrand, sort]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [gender, sale, availability, category, brands, models, sort]);

  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    // One batch per effect cycle; visibleCount in deps re-arms it after each render.
    let loaded = false;
    const loadMore = () => {
      if (loaded) return;
      loaded = true;
      setVisibleCount(current => current + PAGE_SIZE);
    };

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: "600px 0px" });
    observer.observe(sentinel);

    const onScroll = () => {
      if (sentinel.getBoundingClientRect().top < window.innerHeight + 600) loadMore();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [hasMore, visibleCount]);

  function toggleBrand(brand: string) {
    if (!availableBrands.includes(brand)) return;
    const removing = brands.includes(brand);
    const nextBrands = removing ? brands.filter(item => item !== brand) : [...brands, brand];
    let nextModels = models;

    if (removing) {
      const brandModels = modelsByBrand.get(brand);
      if (brandModels) nextModels = models.filter(model => !brandModels.has(model));
    }

    setBrands(nextBrands);
    setModels(nextModels);
    syncUrl({ brands: nextBrands, models: nextModels });
  }

  function toggleModel(model: string) {
    const nextModels = models.includes(model) ? models.filter(item => item !== model) : [...models, model];
    setModels(nextModels);
    syncUrl({ models: nextModels });
  }

  function selectSort(nextSort: SortKey) {
    setSort(nextSort);
    setSortOpen(false);
    syncUrl({ sort: nextSort });
  }

  function clearFilters() {
    setCategory("all");
    setBrands([]);
    setModels([]);
    setAvailability("all");
    setFiltersOpen(false);
    syncUrl({ category: "all", brands: [], models: [], availability: "all", gender: null, sale: null });
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

  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (category !== "all") activeChips.push({ key: "category", label: category, onRemove: () => selectCategory("all") });
  if (availability === "in-stock") activeChips.push({ key: "stock", label: "In Stock", onRemove: () => selectAvailability("all") });
  if (availability === "pre-order") activeChips.push({ key: "stock", label: "Pre-order", onRemove: () => selectAvailability("all") });
  if (sale) activeChips.push({ key: "sale", label: "Sale", onRemove: () => syncUrl({ sale: null }) });
  if (gender) activeChips.push({ key: "gender", label: gender, onRemove: () => syncUrl({ gender: null }) });
  brands.forEach(brand => activeChips.push({ key: `brand-${brand}`, label: brand, onRemove: () => toggleBrand(brand) }));
  models.forEach(model => activeChips.push({ key: `model-${model}`, label: model, onRemove: () => toggleModel(model) }));

  const filtersCount = activeChips.length;

  return (
    <>
      <div className="mobile-controls">
        <button className={`mobile-controls__btn ${filtersOpen ? "active" : ""}`} type="button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={toggleFilters}>
          {filtersOpen ? "Close Filters" : `Filters${filtersCount ? ` (${filtersCount})` : ""}`}
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
              {brandOptions.map(option => {
                const isSelected = brands.includes(option);
                const brandModels = isSelected ? modelsByBrand.get(option) : undefined;
                const modelEntries = brandModels
                  ? [...brandModels.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                  : [];

                return (
                  <div className="filter-brand" key={option}>
                    <button
                      className={`filter-link ${isSelected ? "active" : ""}`}
                      disabled={!availableBrands.includes(option)}
                      type="button"
                      onClick={() => toggleBrand(option)}
                    >
                      {option}
                    </button>
                    {isSelected && modelEntries.length > 1 && (
                      <div className="filter-brand__models">
                        {modelEntries.map(([model, count]) => (
                          <button
                            className={`filter-model ${models.includes(model) ? "active" : ""}`}
                            key={model}
                            type="button"
                            onClick={() => toggleModel(model)}
                          >
                            <span>{model}</span>
                            <small>{count}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="catalog__main">
          <div className="catalog-toolbar">
            {!loading && !error && (
              <span className="catalog-toolbar__count">
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
              </span>
            )}
            {activeChips.length > 0 && (
              <div className="catalog-toolbar__chips">
                {activeChips.map(chip => (
                  <button className="catalog-chip" key={chip.key} type="button" onClick={chip.onRemove} aria-label={`Remove filter ${chip.label}`}>
                    {chip.label}
                    <span aria-hidden="true">&#10005;</span>
                  </button>
                ))}
                <button className="catalog-toolbar__clear" type="button" onClick={clearFilters}>Clear all</button>
              </div>
            )}
          </div>
          <div className="product-grid">
            {loading && <div className="product-grid--empty">Loading products...</div>}
            {!loading && error && <div className="product-grid--empty">{error}</div>}
            {!loading && !error && filtered.length === 0 && <div className="product-grid--empty">No products found</div>}
            {visibleProducts.map((product, index) => (
              <ProductCard product={product} key={product.id} delay={Math.min(index % PAGE_SIZE, MAX_STAGGER_INDEX) * 0.02} />
            ))}
          </div>
          {hasMore && (
            <div className="product-grid__more" ref={loadMoreRef}>
              <button type="button" onClick={() => setVisibleCount(current => current + PAGE_SIZE)}>
                Show more ({filtered.length - visibleCount})
              </button>
            </div>
          )}
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
