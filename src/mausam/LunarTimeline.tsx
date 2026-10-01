import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
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

// Reusable audio context for subtle mechanical click fallback (iOS Safari / desktop)
let sharedAudioCtx: AudioContext | null = null;

function playSubtleTick(isMidnight: boolean) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    const now = sharedAudioCtx.currentTime;

    osc.type = "sine";
    // 850Hz for 2-hour regular tick; 1250Hz for midnight day boundary
    osc.frequency.setValueAtTime(isMidnight ? 1250 : 850, now);

    // Ultra-light tactile click volume
    const volume = isMidnight ? 0.024 : 0.012;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  } catch {
    // Gracefully ignore audio errors (e.g., autoplay restrictions)
  }
}

/**
 * Universal Haptic Trigger
 * - Web Vibration API for Android / Chrome / supporting devices
 * - Web Audio acoustic tactile impulse for iOS Safari / desktop
 */
export function triggerMoonHaptic(isMidnight = false) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      if (isMidnight) {
        // Distinct double-pulse for day change
        navigator.vibrate([16, 28, 12]);
      } else {
        // Subtle crisp micro-pulse
        navigator.vibrate(6);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  playSubtleTick(isMidnight);
}

/**
 * Apple Weather Native Lunar Ruler Scrubber Slider
 * Features:
 * - Fluid 60/120fps hardware-accelerated momentum scrolling on mobile
 * - Native touch physics decoupled from pointer capture for buttery-smooth mobile drag
 * - Web Vibration API + subtle acoustic tactile haptics on every tick & midnight
 * - Live floating time badge & active blue pointer illumination while scrubbing
 * - Zero images / zero 3D models inside the timeline
 */
export function LunarTimeline({
  selectedDate,
  onSelectDate,
  lang = "en",
  className = "",
}: LunarTimelineProps) {
  const t = makeT(lang);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction tracking
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<number | null>(null);
  const isUserInteracting = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Desktop mouse drag tracking
  const isPointerDown = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  // Haptic tick deduplication & RAF batching
  const lastTickRef = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const scrollSettleTimer = useRef<number | null>(null);

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

  // Formatted scrub time display (e.g. "4:00 PM")
  const formattedTime = useMemo(() => {
    let h = selectedDate.getHours();
    const m = selectedDate.getMinutes();
    const ampm = h >= 12 ? (lang === "en" ? "PM" : "अपराह्न") : (lang === "en" ? "AM" : "पूर्वाह्न");
    h = h % 12;
    h = h ? h : 12;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mStr} ${ampm}`;
  }, [selectedDate, lang]);

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
        // Initialize baseline tick position
        lastTickRef.current = Math.round(targetScroll / TICK_SPACING);
      }, 100);
    }, 40);

    return () => clearTimeout(timer);
  }, []);

  // Synchronize ruler position when selectedDate changes externally (e.g. Today / Tomorrow buttons)
  useEffect(() => {
    if (isUserInteracting.current || isPointerDown.current || isProgrammaticScroll.current) return;
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
        lastTickRef.current = Math.round(targetScroll / TICK_SPACING);
      }, 350);
    }
  }, [selectedDate, getScrollLeftForTime]);

  // Handle continuous scrubbing with RAF throttling and discrete haptic pulses
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;

    // 1. Immediate Discrete Haptic Pulse on tick boundary crossing
    const currentTick = Math.round(scrollLeft / TICK_SPACING);
    if (lastTickRef.current !== null && currentTick !== lastTickRef.current) {
      const isMidnight = ((currentTick % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY === 0;
      triggerMoonHaptic(isMidnight);
    }
    lastTickRef.current = currentTick;

    // Skip dispatching external updates if this scroll is programmatic
    if (isProgrammaticScroll.current) return;

    isUserInteracting.current = true;
    setIsScrubbing(true);

    // 2. Clear previous settle timeout and set new one for ending active scrub
    if (scrollSettleTimer.current) {
      clearTimeout(scrollSettleTimer.current);
    }
    scrollSettleTimer.current = window.setTimeout(() => {
      isUserInteracting.current = false;
      setIsScrubbing(false);
    }, 180);

    // 3. Batch date calculation in requestAnimationFrame for 60/120fps smoothness
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const tickIndex = scrollLeft / TICK_SPACING;
      const diffHours = (tickIndex - (RANGE_DAYS * TICKS_PER_DAY)) * 2;
      const newTimestamp = baseMidnight + diffHours * 3600000;
      const newDate = new Date(newTimestamp);
      onSelectDate(newDate);
    });
  }, [baseMidnight, onSelectDate]);

  // Clean up RAF and timers on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (scrollSettleTimer.current) clearTimeout(scrollSettleTimer.current);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // Desktop Pointer Handlers (only intercept mouse; touch is natively handled by scroll container)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      // Mobile touch: let the browser compositor execute native momentum scrolling
      isUserInteracting.current = true;
      setIsScrubbing(true);
      return;
    }

    // Mouse drag
    isPointerDown.current = true;
    isUserInteracting.current = true;
    setIsScrubbing(true);
    startX.current = e.clientX;
    startScrollLeft.current = containerRef.current?.scrollLeft || 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // Touch scrolling handled natively
    if (!isPointerDown.current || !containerRef.current) return;

    const dx = e.clientX - startX.current;
    containerRef.current.scrollLeft = startScrollLeft.current - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (!isPointerDown.current) return;

    isPointerDown.current = false;
    isUserInteracting.current = false;
    setIsScrubbing(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`relative w-full select-none py-2 ${className}`}>
      {/* 1. Fixed Blue Downward Triangle Pointer (▼) at Center with live time chip */}
      <div className="flex flex-col items-center mb-1 relative z-20 pointer-events-none">
        {/* Live floating scrub badge on interaction */}
        <div
          className={`transition-all duration-150 transform mb-1 flex items-center justify-center ${
            isScrubbing ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-1"
          }`}
        >
          <span className="rounded-full bg-[#38bdf8]/20 border border-[#38bdf8]/40 px-2 py-0.5 font-mono text-[9px] font-semibold text-[#38bdf8] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {formattedTime}
          </span>
        </div>

        {/* Inverted triangle pointer */}
        <svg
          viewBox="0 0 10 7"
          className={`h-2.5 w-3 fill-[#38bdf8] transition-transform duration-150 ${
            isScrubbing
              ? "scale-125 drop-shadow-[0_2px_8px_rgba(56,189,248,0.85)] brightness-110"
              : "scale-100 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
          }`}
        >
          <path d="M5 7L0 0h10L5 7z" />
        </svg>
      </div>

      {/* 2. Horizontal Ruler Scrubber Container */}
      <div className="relative">
        {/* Subtle center alignment guide line behind the blue arrow */}
        <div
          className={`pointer-events-none absolute left-1/2 top-0 bottom-6 -translate-x-1/2 w-[1.5px] z-10 transition-colors duration-150 ${
            isScrubbing ? "bg-[#38bdf8]/75 shadow-[0_0_6px_rgba(56,189,248,0.5)]" : "bg-[#38bdf8]/35"
          }`}
        />

        {/* Scrollable track with hardware acceleration, momentum scroll, and edge masks */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={() => {
            isUserInteracting.current = true;
            setIsScrubbing(true);
          }}
          className="scroll-hide flex overflow-x-auto cursor-grab active:cursor-grabbing select-none"
          style={{
            // Left/right padding so the first & last ticks can align with center pointer
            paddingLeft: "calc(50%)",
            paddingRight: "calc(50%)",
            maskImage: "linear-gradient(to right, transparent, black 16%, black 84%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 16%, black 84%, transparent)",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
            touchAction: "pan-x",
            willChange: "scroll-position",
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
                          className={`rounded-full transition-colors duration-100 ${
                            isMidnight
                              ? "h-5 w-[1.8px] bg-white/85 shadow-[0_0_2px_rgba(255,255,255,0.4)]"
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
                    className={`font-mono text-[9.5px] uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-150 ${
                      day.isToday ? "text-[#38bdf8] font-bold" : "text-white/45 font-medium"
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
