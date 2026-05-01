"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/context/ProductsContext";

type SortKey = "newest" | "price-asc" | "price-desc";

export function CatalogClient() {
  const { products, loading } = useProducts();
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get("category") || "all");
  const [brands, setBrands] = useState<string[]>(params.get("brand") ? [params.get("brand") as string] : []);
  const [sort, setSort] = useState<SortKey>("newest");
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
    if (category !== "all") result = result.filter(product => product.category === category);

    return [...new Set(result.map(product => product.brand))].sort();
  }, [products, gender, sale, category]);

  useEffect(() => {
    setCategory(params.get("category") || "all");
    setBrands(params.get("brand") ? [params.get("brand") as string] : []);
  }, [params]);

  useEffect(() => {
    setBrands(current => current.filter(brand => availableBrands.includes(brand)));
  }, [availableBrands]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (gender) result = result.filter(product => product.gender === gender || product.gender === "Unisex");
    if (sale) result = result.filter(product => product.salePrice);
    if (category !== "all") result = result.filter(product => product.category === category);
    if (brands.length) result = result.filter(product => brands.includes(product.brand));

    if (sort === "price-asc") result.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    if (sort === "price-desc") result.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    if (sort === "newest") result.sort((a, b) => Number(b.isNew) - Number(a.isNew));

    return result;
  }, [products, gender, sale, category, brands, sort]);

  function toggleBrand(brand: string) {
    if (!availableBrands.includes(brand)) return;
    setBrands(current => current.includes(brand) ? current.filter(item => item !== brand) : [...current, brand]);
  }

  return (
    <>
      <div className="mobile-controls">
        <button className={`mobile-controls__btn ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}>Filters</button>
        <button className={`mobile-controls__btn ${sortOpen ? "active" : ""}`} onClick={() => setSortOpen(!sortOpen)}>Sort</button>
      </div>

      <div className="catalog">
        <aside className={`catalog__filters ${filtersOpen ? "open" : ""}`}>
          <div className="filter-section">
            <div className="filter-section__title">Categories</div>
            <button className={`filter-link ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>All</button>
            {categories.map(option => (
              <button className={`filter-link ${category === option ? "active" : ""}`} key={option} onClick={() => setCategory(option)}>
                {option}
              </button>
            ))}
          </div>
          <div className="filter-section">
            <div className="filter-section__title">Designers</div>
            <div className="designers-list">
              {brandOptions.map(option => (
                <button
                  className={`filter-link ${brands.includes(option) ? "active" : ""}`}
                  disabled={!availableBrands.includes(option)}
                  key={option}
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
            {!loading && filtered.length === 0 && <div className="product-grid--empty">No products found</div>}
            {filtered.map((product, index) => (
              <ProductCard product={product} key={product.id} delay={index * 0.02} />
            ))}
          </div>
        </section>

        <aside className={`catalog__sort ${sortOpen ? "open" : ""}`}>
          <div className="sort-section">
            <div className="sort-section__title">Sort</div>
            <button className={`sort-link ${sort === "newest" ? "active" : ""}`} onClick={() => setSort("newest")}>Latest Arrivals</button>
            <button className={`sort-link ${sort === "price-asc" ? "active" : ""}`} onClick={() => setSort("price-asc")}>Price: Low to high</button>
            <button className={`sort-link ${sort === "price-desc" ? "active" : ""}`} onClick={() => setSort("price-desc")}>Price: High to low</button>
          </div>
        </aside>
      </div>
    </>
  );
}
