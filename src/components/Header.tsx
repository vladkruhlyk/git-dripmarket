"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";

export function Header({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"Men" | "Women" | "Sale" | "">("");
  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    const updateActiveFilter = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("sale")) {
        setActiveFilter("Sale");
      } else if (params.get("gender") === "Men") {
        setActiveFilter("Men");
      } else if (params.get("gender") === "Women") {
        setActiveFilter("Women");
      } else {
        setActiveFilter("");
      }
    };

    updateActiveFilter();
  }, [pathname]);

  function pushCatalog(filter: "Men" | "Women" | "Sale") {
    const params = new URLSearchParams(window.location.search);
    setActiveFilter(filter);
    if (filter === "Sale") {
      params.set("sale", "1");
      params.delete("gender");
    } else {
      params.set("gender", filter);
      params.delete("sale");
    }
    router.push(`/catalog?${params.toString()}`);
  }

  return (
    <header className={`header ${isHome ? "header--hero" : ""} ${scrolled ? "scrolled" : ""}`}>
      <nav className="header__left" aria-label="Main navigation">
        {isHome ? (
          <>
            <Link href="/catalog" className="header__nav-link">Catalog</Link>
            <Link href="/catalog" className="header__nav-link">Lookbook</Link>
            <Link href="/catalog" className="header__nav-link">About Us</Link>
          </>
        ) : (
          <>
            <button className={`header__nav-link ${activeFilter === "Men" ? "active" : ""}`} onClick={() => pushCatalog("Men")}>Menswear</button>
            <button className={`header__nav-link ${activeFilter === "Women" ? "active" : ""}`} onClick={() => pushCatalog("Women")}>Womenswear</button>
            <button className={`header__nav-link ${activeFilter === "Sale" ? "active" : ""}`} onClick={() => pushCatalog("Sale")}>Sale</button>
            <button className="header__nav-link" onClick={onSearch}>Search</button>
          </>
        )}
      </nav>

      <div className="header__center">
        <Link href="/" className="header__logo" aria-label="DRIP. home">
          <Image src="/logo.png" alt="DRIP." width={152} height={48} priority />
        </Link>
      </div>

      <div className="header__right">
        {isHome && <button className="header__action" onClick={onSearch}>Search</button>}
        {!isHome && <button className="header__action header__mobile-search" onClick={onSearch}>Search</button>}
        <Link href="/cart" className="header__action">Bag ({count})</Link>
      </div>
    </header>
  );
}
