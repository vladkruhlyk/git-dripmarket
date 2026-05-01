"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { InitialLoader } from "@/components/InitialLoader";
import { SearchOverlay } from "@/components/SearchOverlay";
import { Toast } from "@/components/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), 220);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <InitialLoader />
      <Header onSearch={() => setSearchOpen(true)} />
      <main>{children}</main>
      <div className={`route-fade ${transitioning ? "route-fade--active" : ""}`} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toast />
    </>
  );
}
