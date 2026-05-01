"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LOADER_KEY = "drip_loader_played";

export function InitialLoader() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(LOADER_KEY)) return;

    setVisible(true);
    const hideTimer = window.setTimeout(() => {
      setHiding(true);
      sessionStorage.setItem(LOADER_KEY, "true");
    }, 1800);
    const removeTimer = window.setTimeout(() => setVisible(false), 2350);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`loader ${hiding ? "loader--hidden" : ""}`}>
      <Image src="/logo.png" alt="DRIP." width={180} height={57} className="loader__logo" priority />
      <div className="loader__line" />
    </div>
  );
}
