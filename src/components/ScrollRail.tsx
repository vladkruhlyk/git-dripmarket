"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type ScrollRailProps = {
  title: string;
  href?: string;
  linkLabel?: string;
  variant: "products";
  children: React.ReactNode;
};

export function ScrollRail({ title, href, linkLabel = "View all", variant, children }: ScrollRailProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateEdges();
    track.addEventListener("scroll", updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [updateEdges]);

  function scrollPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <section className={`hp-section hp-section--${variant}`}>
      <div className="hp-section__head">
        <h2 className="hp-section__title">{title}</h2>
        <div className="hp-section__actions">
          {href && <Link href={href} className="hp-section__link">{linkLabel}</Link>}
          {(canPrev || canNext) && (
            <div className="hp-section__arrows">
              <button type="button" aria-label="Scroll back" disabled={!canPrev} onClick={() => scrollPage(-1)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
              </button>
              <button type="button" aria-label="Scroll forward" disabled={!canNext} onClick={() => scrollPage(1)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="hp-section__track" ref={trackRef}>
        {children}
      </div>
    </section>
  );
}
