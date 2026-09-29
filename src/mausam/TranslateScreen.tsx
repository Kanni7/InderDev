import { useState, useRef, useEffect, type CSSProperties } from "react";
import {
  LANGUAGES,
  MAX_CHARS,
  translateText,
  detectLanguage,
  speak,
  listenSpeech,
  extractTextFromImage,
  langName,
  langNative,
  HAS_SPEECH_RECOGNITION,
  HAS_TTS,
  type ConvoMessage,
} from "./translateService";
import * as I from "./icons";

const PANEL = "#090d16";

function ground(accent: string): CSSProperties {
  return {
    background: `radial-gradient(130% 75% at 50% 0%, color-mix(in srgb, var(--wx-bg-solid, ${PANEL}) 65%, ${accent}) 0%, var(--wx-bg-solid, ${PANEL}) 60%, rgba(5,7,12,0.92) 100%)`,
  };
}

/* ════════════════ Main export ════════════════ */

export default function TranslateScreen({
  accent,
  onClose,
}: {
  accent: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"translate" | "conversation">("translate");

  return (
    <div
      className="flex h-full flex-col text-[var(--color-ink)] overflow-hidden"
      style={ground(accent)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-3 pt-14 border-b border-white/8">
        <button
          onClick={onClose}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur-md active:scale-95"
        >
          <I.Chevron className="h-4 w-4 rotate-180 text-[var(--color-ink-soft)]" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold">Translate</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 py-3">
        {(["translate", "conversation"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold capitalize transition active:scale-[0.98]"
            style={{
              background: tab === t ? accent : "rgba(255,255,255,0.08)",
              color: tab === t ? "#000" : "var(--color-ink-soft)",
            }}
          >
            {t === "translate" ? "Translate" : "Conversation"}
          </button>
        ))}
      </div>

      {/* Body */}
      {tab === "translate" ? (
        <TranslateTab accent={accent} />
      ) : (
        <ConversationTab accent={accent} />
      )}
    </div>
  );
}

/* ════════════════ Translate Tab ════════════════ */

function TranslateTab({ accent }: { accent: string }) {
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("hi");
  const [srcText, setSrcText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [pickLang, setPickLang] = useState<"src" | "tgt" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-detect on text change
  useEffect(() => {
    if (srcText.trim()) {
      const d = detectLanguage(srcText);
      setDetected(d);
      if (d !== "en" || !/[a-zA-Z]/.test(srcText)) setSrcLang(d);
    } else {
      setDetected(null);
    }
  }, [srcText]);

  async function handleTranslate() {
    if (!srcText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const r = await translateText({
        text: srcText,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      });
      setResult(r.translatedText);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    setSrcLang(tgtLang);
    setTgtLang(srcLang);
    setSrcText(result);
    setResult(srcText);
  }

  function handleClear() {
    setSrcText("");
    setResult("");
    setError(null);
    setDetected(null);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleMic() {
    if (!HAS_SPEECH_RECOGNITION) return;
    setListening(true);
    try {
      const text = await listenSpeech(srcLang);
      setSrcText((p) => (p ? p + " " + text : text));
    } catch {
      /* user cancelled or no permission */
    } finally {
      setListening(false);
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const text = await extractTextFromImage(file);
      setSrcText(text.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OCR failed.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="scroll-hide flex-1 overflow-y-auto px-5 pb-8">
      {/* Language picker overlay */}
      {pickLang && (
        <LangPicker
          selected={pickLang === "src" ? srcLang : tgtLang}
          onSelect={(code) => {
            if (pickLang === "src") setSrcLang(code);
            else setTgtLang(code);
            setPickLang(null);
          }}
          onClose={() => setPickLang(null)}
          accent={accent}
        />
      )}

      {/* Source language */}
      <button
        onClick={() => setPickLang("src")}
        className="mt-2 flex items-center gap-2 rounded-xl bg-white/8 px-3.5 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
      >
        <span style={{ color: accent }}>{langNative(srcLang)}</span>
        <I.Chevron className="h-3 w-3 rotate-90 text-[var(--color-ink-faint)]" />
        {detected && detected !== "en" && (
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-soft)]">
            Detected: {langName(detected)}
          </span>
        )}
      </button>

      {/* Source text input */}
      <div className="mt-3 rounded-3xl mausam-glass p-4">
        <textarea
          value={srcText}
          onChange={(e) => setSrcText(e.target.value)}
          placeholder="Type or paste text..."
          maxLength={MAX_CHARS}
          rows={4}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
          dir={srcLang === "ar" ? "rtl" : "ltr"}
        />
        <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2">
          <div className="flex items-center gap-2">
            {HAS_SPEECH_RECOGNITION && (
              <button
                onClick={handleMic}
                className="grid h-8 w-8 place-items-center rounded-full transition active:scale-95"
                style={{
                  background: listening ? accent : "rgba(255,255,255,0.1)",
                  color: listening ? "#000" : "var(--color-ink-soft)",
                }}
                aria-label="Voice input"
              >
                <MicIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[var(--color-ink-soft)] transition active:scale-95"
              aria-label="Image input"
            >
              <CameraIcon className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImage}
            />
          </div>
          <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">
            {srcText.length}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Swap button */}
      <div className="flex justify-center py-3">
        <button
          onClick={handleSwap}
          className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-[var(--color-ink)] backdrop-blur-md transition active:scale-90 hover:bg-white/20"
          aria-label="Swap languages"
        >
          <SwapIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Target language */}
      <button
        onClick={() => setPickLang("tgt")}
        className="flex items-center gap-2 rounded-xl bg-white/8 px-3.5 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
      >
        <span style={{ color: accent }}>{langNative(tgtLang)}</span>
        <I.Chevron className="h-3 w-3 rotate-90 text-[var(--color-ink-faint)]" />
      </button>

      {/* Output */}
      <div className="mt-3 min-h-[140px] rounded-3xl mausam-glass p-4 relative">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: accent }}
            />
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Translating…
            </span>
          </div>
        ) : error ? (
          <p className="text-[13px] text-[var(--color-tier-critical)] leading-relaxed whitespace-pre-wrap">
            {error}
          </p>
        ) : result ? (
          <p
            className="text-[15px] leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap"
            dir={tgtLang === "ar" ? "rtl" : "ltr"}
          >
            {result}
          </p>
        ) : (
          <p className="py-6 text-center text-[13px] text-[var(--color-ink-faint)]">
            Translation will appear here
          </p>
        )}

        {/* Copy + Speaker row */}
        {result && !loading && (
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/8 pt-2">
            {HAS_TTS && (
              <button
                onClick={() => speak(result, tgtLang)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[var(--color-ink-soft)] transition active:scale-95"
                aria-label="Listen"
              >
                <SpeakerIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-soft)] transition active:scale-95"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <button
        onClick={handleTranslate}
        disabled={!srcText.trim() || loading}
        className="mt-4 w-full rounded-2xl py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-30"
        style={{ background: accent }}
      >
        {loading ? "Translating…" : "Translate"}
      </button>

      {(srcText || result) && (
        <button
          onClick={handleClear}
          className="mt-2 w-full py-2 text-center text-[13px] font-medium text-[var(--color-ink-faint)] transition hover:text-[var(--color-ink-soft)]"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ════════════════ Conversation Tab ════════════════ */

function ConversationTab({ accent }: { accent: string }) {
  const [langA, setLangA] = useState("en");
  const [langB, setLangB] = useState("hi");
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [input, setInput] = useState("");
  const [speaker, setSpeaker] = useState<"a" | "b">("a");
  const [loading, setLoading] = useState(false);
  const [pickLang, setPickLang] = useState<"a" | "b" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  let nextId = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const src = speaker === "a" ? langA : langB;
    const tgt = speaker === "a" ? langB : langA;

    try {
      const r = await translateText({
        text,
        sourceLanguage: src,
        targetLanguage: tgt,
      });
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          sender: speaker,
          original: text,
          translated: r.translatedText,
          srcLang: src,
          tgtLang: tgt,
        },
      ]);
      setSpeaker(speaker === "a" ? "b" : "a");
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          sender: speaker,
          original: text,
          translated: "⚠ Translation failed",
          srcLang: src,
          tgtLang: tgt,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMic() {
    if (!HAS_SPEECH_RECOGNITION) return;
    const lang = speaker === "a" ? langA : langB;
    try {
      const text = await listenSpeech(lang);
      setInput(text);
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Language picker overlay */}
      {pickLang && (
        <LangPicker
          selected={pickLang === "a" ? langA : langB}
          onSelect={(code) => {
            if (pickLang === "a") setLangA(code);
            else setLangB(code);
            setPickLang(null);
          }}
          onClose={() => setPickLang(null)}
          accent={accent}
        />
      )}

      {/* Language pair header */}
      <div className="flex items-center justify-center gap-3 px-5 pb-3">
        <button
          onClick={() => setPickLang("a")}
          className="rounded-xl bg-white/10 px-4 py-2 text-[13px] font-semibold transition active:scale-95"
          style={{ color: accent }}
        >
          {langNative(langA)}
        </button>
        <button
          onClick={() => {
            setLangA(langB);
            setLangB(langA);
          }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[var(--color-ink-soft)] transition active:scale-90"
          aria-label="Swap"
        >
          <SwapIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPickLang("b")}
          className="rounded-xl bg-white/10 px-4 py-2 text-[13px] font-semibold transition active:scale-95"
          style={{ color: accent }}
        >
          {langNative(langB)}
        </button>
      </div>

      {/* Speaker indicator */}
      <div className="px-5 pb-2 text-center">
        <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-medium text-[var(--color-ink-faint)]">
          Speaking as:{" "}
          <span className="font-semibold" style={{ color: accent }}>
            Person {speaker.toUpperCase()} ({langName(speaker === "a" ? langA : langB)})
          </span>
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-hide flex-1 space-y-3 overflow-y-auto px-5 py-3">
        {messages.length === 0 && (
          <p className="py-12 text-center text-[13px] text-[var(--color-ink-faint)]">
            Start a conversation. Messages translate automatically between {langName(langA)} and {langName(langB)}.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === "a" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] space-y-1 rounded-3xl p-3.5 ${
                m.sender === "a" ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={{
                background:
                  m.sender === "a"
                    ? `${accent}22`
                    : "rgba(255,255,255,0.08)",
                border: `1px solid ${
                  m.sender === "a" ? `${accent}44` : "rgba(255,255,255,0.1)"
                }`,
              }}
            >
              <p className="text-[14px] font-medium text-[var(--color-ink)]">
                {m.original}
              </p>
              <p className="text-[13px] text-[var(--color-ink-soft)]" style={{ color: accent }}>
                {m.translated}
              </p>
              <span className="block text-[10px] text-[var(--color-ink-faint)]">
                {langName(m.srcLang)} → {langName(m.tgtLang)}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-2">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: accent }} />
            <span className="text-[11px] text-[var(--color-ink-faint)]">Translating…</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-white/8 px-5 pb-7 pt-3">
        <div className="flex items-center gap-2 rounded-full mausam-glass py-2 pl-4 pr-2">
          {HAS_SPEECH_RECOGNITION && (
            <button
              onClick={handleMic}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[var(--color-ink-soft)] transition active:scale-95"
              aria-label="Voice input"
            >
              <MicIcon className="h-4 w-4" />
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[var(--color-ink-faint)]"
            placeholder={`Type in ${langName(speaker === "a" ? langA : langB)}…`}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="grid h-9 w-9 place-items-center rounded-full text-black transition active:scale-95 disabled:opacity-30"
            style={{ background: accent }}
          >
            <I.Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ Language Picker Modal ════════════════ */

function LangPicker({
  selected,
  onSelect,
  onClose,
  accent,
}: {
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  accent: string;
}) {
  const [q, setQ] = useState("");
  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(q.toLowerCase()) ||
      l.native.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        aria-label="Close"
      />
      <div className="relative mx-auto mt-24 w-[90%] max-w-[360px] animate-insight overflow-hidden rounded-3xl border border-white/15 bg-[color:rgba(12,18,28,0.96)] shadow-2xl backdrop-blur-2xl">
        <div className="border-b border-white/10 px-4 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search languages…"
            autoFocus
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[var(--color-ink-faint)]"
          />
        </div>
        <div className="scroll-hide max-h-[320px] overflow-y-auto">
          {filtered.map((l) => {
            const active = l.code === selected;
            return (
              <button
                key={l.code}
                onClick={() => onSelect(l.code)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-white/6 border-b border-white/5"
                style={{ background: active ? "rgba(255,255,255,0.08)" : undefined }}
              >
                <span className="text-[14px] font-medium text-[var(--color-ink)]">
                  {l.name}{" "}
                  <span className="text-[var(--color-ink-faint)]">{l.native}</span>
                </span>
                {active && (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ════════════════ Inline SVG icons ════════════════ */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S}>
      <path d="M7 4v16M7 20l-3-3m3 3l3-3M17 20V4m0 0l3 3m-3-3l-3 3" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...S}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
