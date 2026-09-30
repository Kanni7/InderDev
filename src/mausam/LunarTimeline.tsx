import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { makeT, type Lang } from "./i18n";

interface LunarTimelineProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  lang?: Lang;
  className?: string;
}

const RANGE_DAYS = 30; // -30 to +30 days
const TICKS_PER_DAY = 12; // 1 tick every 2 hours (00:00, 02:00, ..., 22:00)
const TICK_SPACING = 12; // px per tick
const DAY_WIDTH = TICKS_PER_DAY * TICK_SPACING; // 144px per day

/**
 * Apple Weather Native Lunar Ruler Scrubber Slider
 * Matches media_1790738039936.png:
 * - Horizontal ruler track with vertical tick marks (subtle 2h ticks + tall midnight ticks).
 * - Blue downward inverted triangle pointer (▼) pointing at the current scrubbed time.
 * - Day labels (TUESDAY, TODAY, THURSDAY) below the ticks.
 * - Smooth horizontal touch / mouse drag scrubbing.
 * - Real-time date & phase updates as the user scrubs.
 * - ZERO image thumbnails and ZERO 3D models in the timeline.
 */
export function LunarTimeline({
  selectedDate,
  onSelectDate,
  lang = "en",
  className = "",
}: LunarTimelineProps) {
  const t = makeT(lang);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  // Mouse drag state for desktop scrubbing
  const isPointerDown = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  // Base midnight timestamp for today
  const baseMidnight = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
  }, []);

  // Precompute days and tick data (-30 to +30 days)
  const days = useMemo(() => {
    const list: {
      offset: number;
      label: string;
      isToday: boolean;
    }[] = [];

    for (let offset = -RANGE_DAYS; offset <= RANGE_DAYS; offset++) {
      const d = new Date(baseMidnight + offset * 86400000);
      const isToday = offset === 0;
      let label = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      if (isToday) label = "TODAY";

      list.push({
        offset,
        label,
        isToday,
      });
    }
    return list;
  }, [baseMidnight]);

  // Convert a timestamp to the exact scrollLeft in the ruler
  const getScrollLeftForTime = useCallback((timestamp: number) => {
    const diffMs = timestamp - baseMidnight;
    const diffHours = diffMs / 3600000;
    const totalTicks = (RANGE_DAYS * TICKS_PER_DAY) + (diffHours / 2);
    return totalTicks * TICK_SPACING;
  }, [baseMidnight]);

  // Center on current time on initial mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const targetScroll = getScrollLeftForTime(selectedDate.getTime());
      isProgrammaticScroll.current = true;
      container.scrollLeft = targetScroll;
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 100);
    }, 40);

    return () => clearTimeout(timer);
  }, []);

  // Synchronize ruler position when selectedDate changes externally (e.g. Today / Tomorrow / Upcoming phases)
  useEffect(() => {
    if (isPointerDown.current || isProgrammaticScroll.current) return;
    const container = containerRef.current;
    if (!container) return;

    const targetScroll = getScrollLeftForTime(selectedDate.getTime());
    if (Math.abs(container.scrollLeft - targetScroll) > 4) {
      isProgrammaticScroll.current = true;
      container.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = window.setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 350);
    }
  }, [selectedDate, getScrollLeftForTime]);

  // Handle continuous scrubbing while scrolling
  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    const container = containerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const tickIndex = scrollLeft / TICK_SPACING;
    const diffHours = (tickIndex - (RANGE_DAYS * TICKS_PER_DAY)) * 2;
    const newTimestamp = baseMidnight + diffHours * 3600000;

    const newDate = new Date(newTimestamp);
    onSelectDate(newDate);
  }, [baseMidnight, onSelectDate]);

  // Mouse Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = containerRef.current?.scrollLeft || 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current || !containerRef.current) return;
    const dx = e.clientX - startX.current;
    containerRef.current.scrollLeft = startScrollLeft.current - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`relative w-full select-none py-2 ${className}`}>
      {/* 1. Fixed Blue Downward Triangle Pointer (▼) at Center */}
      <div className="flex justify-center mb-1 relative z-20 pointer-events-none">
        <svg
          viewBox="0 0 10 7"
          className="h-2 w-2.5 fill-[#38bdf8] drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
        >
          <path d="M5 7L0 0h10L5 7z" />
        </svg>
      </div>

      {/* 2. Horizontal Ruler Scrubber Container */}
      <div className="relative">
        {/* Subtle center alignment guide line behind the blue arrow */}
        <div className="pointer-events-none absolute left-1/2 top-0 bottom-6 -translate-x-1/2 w-[1.5px] bg-[#38bdf8]/40 z-10" />

        {/* Scrollable track with gradient edge masks */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="scroll-hide flex overflow-x-auto touch-pan-x cursor-grab active:cursor-grabbing"
          style={{
            // Left/right padding so the first & last ticks can align with center pointer
            paddingLeft: "calc(50%)",
            paddingRight: "calc(50%)",
            maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          }}
        >
          {days.map((day) => {
            return (
              <div
                key={day.offset}
                className="flex shrink-0 flex-col items-center"
                style={{ width: DAY_WIDTH }}
              >
                {/* Ticks for this 24-hour day (12 ticks, every 2 hours) */}
                <div className="flex items-end h-6 w-full">
                  {Array.from({ length: TICKS_PER_DAY }).map((_, i) => {
                    const isMidnight = i === 0;
                    return (
                      <div
                        key={i}
                        className="flex justify-center"
                        style={{ width: TICK_SPACING }}
                      >
                        <div
                          className={`rounded-full ${
                            isMidnight
                              ? "h-5 w-[1.8px] bg-white/80"
                              : "h-3.5 w-[1.2px] bg-white/20"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Day label underneath the ticks (e.g. TUESDAY, TODAY, THURSDAY) */}
                <div className="mt-2 text-center">
                  <span
                    className={`font-mono text-[9.5px] uppercase tracking-[0.2em] whitespace-nowrap ${
                      day.isToday ? "text-white/85 font-semibold" : "text-white/45 font-medium"
                    }`}
                  >
                    {t(day.label)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
