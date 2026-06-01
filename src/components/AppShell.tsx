"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { PromoPopup } from "@/components/PromoPopup";
import { SearchOverlay } from "@/components/SearchOverlay";
import { Toast } from "@/components/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const mounted = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), 140);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <Header onSearch={() => setSearchOpen(true)} />
      <main>{children}</main>
      <div className={`route-fade ${transitioning ? "route-fade--active" : ""}`} />
      <PromoPopup />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toast />
    </>
  );
}
