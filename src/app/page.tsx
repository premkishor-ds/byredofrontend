"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "ai";
  content: string;
  products?: any[];
  follow_up?: string[];
}

const ByredoLogo = ({ width = 120 }: { width?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={width} viewBox="0 0 382 80" fill="none">
    <path fill="currentColor" d="M.502 0h13.364v66.665L.502 79.998zM27.23 66.665c7.488 0 13.497-6 13.497-13.333C40.727 46 34.712 40 27.23 40V26.666c3.741 0 6.682-2.934 6.682-6.661 0-3.733-2.94-6.667-6.682-6.667V0c11.09 0 20.05 8.93 20.05 20 0 4.531-1.472-8.663-4.007 11.996 6.415 4.803 10.69 12.668 10.69 21.331 0 14.67-11.891 26.666-26.728 26.666V66.665zM60.666 26.666V0H74.03v26.661h13.364L74.03 39.999zM87.389 40l13.364-13.333V0h13.364v26.661l-13.364 13.333V66.66L87.389 79.993zM127.512 0h13.364v66.665l-13.364 13.333zm26.722 40c7.355 0 13.364-6.002 13.364-13.334s-6.014-13.333-13.364-13.333V0c14.704 0 26.728 11.997 26.728 26.661 0 14.67-12.024 26.666-26.728 26.666zm13.369 13.332 13.364 13.333v13.333h-13.364zM194.355 0h13.364v66.665l-13.364 13.333zm26.723 0h26.728v13.333h-26.728zm0 26.666h26.728V40h-26.728zm0 40h26.728v13.332h-26.728zM261.201 0h13.364v66.665l-13.364 13.333zm26.723 66.665c7.354 0 13.364-6 13.364-13.333V26.666c0-7.332-6.015-13.333-13.364-13.333V0c14.837 0 26.728 11.997 26.728 26.661v26.666c0 14.67-11.891 26.666-26.728 26.666zM328.04 26.668c0-14.664 12.025-26.661 26.723-26.661 14.837 0 26.728 11.997 26.728 26.66l-13.364 13.334V26.668a13.303 13.303 0 0 0-13.364-13.333c-7.349 0-13.364 6-13.364 13.333L328.035 40V26.668zm0 26.666 13.364-13.333v13.333c0 7.332 6.015 13.333 13.364 13.333a13.3 13.3 0 0 0 13.364-13.333l13.364-13.333v13.333c0 14.67-11.891 26.666-26.728 26.666-14.698 0-26.728-11.997-26.728-26.666" />
  </svg>
);

const categories = ["Perfume", "Makeup", "Home", "Body Care"];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const [placeholder, setPlaceholder] = useState("");
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const [apiBase, setApiBase] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const host = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:5063`;
    setApiBase(host);

    fetch(`${host}/placeholders`)
      .then(r => r.json())
      .then(d => setPlaceholders(d.placeholders || []))
      .catch(() => setPlaceholders([
        "Discover the olfactory world of Byredo...",
        "Find a Byredo store near me...",
        "Show me the latest makeup collection...",
        "What home fragrances does Byredo offer?",
        "Recommend a perfume for gifting..."
      ]));

    const pending = localStorage.getItem("byredo_pending_query");
    if (pending) {
      localStorage.removeItem("byredo_pending_query");
      setTimeout(() => startSearch(pending, `http://${window.location.hostname}:5063`), 500);
    }
  }, []);

  useEffect(() => {
    if (placeholders.length === 0) return;
    const current = placeholders[placeholderIdx];
    const speed = isDeleting ? 25 : 65;
    const pause = 2800;
    const timeout = setTimeout(() => {
      if (!isDeleting && charIdx < current.length) {
        setPlaceholder(current.substring(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      } else if (isDeleting && charIdx > 0) {
        setPlaceholder(current.substring(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      } else if (!isDeleting && charIdx === current.length) {
        setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && charIdx === 0) {
        setIsDeleting(false);
        setPlaceholderIdx((i) => (i + 1) % placeholders.length);
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, placeholderIdx, placeholders]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSubmit = (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const q = directQuery || query;
    if (!q.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", content: q }]);
    const host = apiBase || `http://${window.location.hostname}:5063`;
    startSearch(q, host);
  };

  const startSearch = async (q: string, host: string) => {
    setQuery("");
    setIsSearchActive(true);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
      const res = await fetch(`${host}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, history }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const aiMsg: Message = {
        role: "ai",
        content: data.answer || "",
        products: data.products || [],
        follow_up: data.follow_up || [],
      };
      setMessages(prev => [...prev, aiMsg]);
      try {
        const saved = localStorage.getItem("byredo_full_history");
        let hist = saved ? JSON.parse(saved) : [];
        hist = [{ id: Date.now(), timestamp: new Date().toLocaleString(), query: q, answer: aiMsg.content, products: aiMsg.products }, ...hist].slice(0, 50);
        localStorage.setItem("byredo_full_history", JSON.stringify(hist));
      } catch (_) {}
    } catch {
      setMessages(prev => [...prev, {
        role: "ai",
        content: "I'm momentarily unable to reach the Byredo archives. Please try again in a moment.",
        products: [],
        follow_up: ["Show me perfumes", "Explore collections", "Find a store"],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setIsSearchActive(false);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const renderAnswer = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 8 }} />;
      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
      const content = isBullet ? trimmed.slice(2) : trimmed;
      const parts = content.split(/(\*\*.*?\*\*)/g).map((seg, j) =>
        seg.startsWith("**") && seg.endsWith("**")
          ? <strong key={j} style={{ fontWeight: 600 }}>{seg.slice(2, -2)}</strong>
          : seg
      );
      if (isBullet) return (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <span style={{ color: "#888", marginTop: 2, flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 15, lineHeight: 1.75, color: "#222" }}>{parts}</span>
        </div>
      );
      return <p key={i} style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 12, color: "#222" }}>{parts}</p>;
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", display: "flex", flexDirection: "column" }}>

      {/* ─── HEADER ─── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 300,
        background: "rgba(250,250,248,0.92)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #ebebeb",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 72,
      }}>
        <button onClick={resetChat} style={{ background: "none", border: "none", cursor: "pointer", color: "#111", display: "flex", alignItems: "center" }}>
          <ByredoLogo width={110} />
        </button>

        {/* Category nav */}
        <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => handleSubmit(undefined, `Show me ${c} products`)}
              style={{
                fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#777", background: "none", border: "1px solid transparent",
                borderRadius: 100, padding: "6px 14px", cursor: "pointer",
                transition: "all 0.2s", fontFamily: "inherit"
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#111"; e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.background = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#777"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "none"; }}
            >{c}</button>
          ))}
        </nav>

        <button
          onClick={() => router.push("/logs")}
          style={{
            fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#777", background: "#fff", border: "1px solid #e8e8e8",
            borderRadius: 100, padding: "7px 18px", cursor: "pointer",
            transition: "all 0.2s", fontFamily: "inherit"
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#111"; e.currentTarget.style.borderColor = "#111"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#777"; e.currentTarget.style.borderColor = "#e8e8e8"; }}
        >History</button>
      </header>

      {/* ─── HERO (empty state) ─── */}
      {!isSearchActive && (
        <main style={{
          flex: 1, paddingTop: 72,
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          minHeight: "100vh", padding: "72px 24px 40px",
        }}>
          <div style={{ textAlign: "center", maxWidth: 580, width: "100%", animation: "fadeInUp 0.6s ease forwards" }}>
            {/* Logo large */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28, color: "#111" }}>
              <ByredoLogo width={180} />
            </div>

            <p style={{ fontSize: 14, color: "#999", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
              AI Concierge
            </p>
            <p style={{ fontSize: 16, color: "#555", marginBottom: 48, lineHeight: 1.7 }}>
              Discover fragrances, makeup, home scents &amp; stores worldwide
            </p>

            {/* Search bar */}
            <form onSubmit={handleSubmit} style={{ position: "relative", marginBottom: 32 }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder || "Search Byredo..."}
                style={{
                  width: "100%", padding: "18px 120px 18px 22px",
                  fontSize: 15, border: "1.5px solid #222", borderRadius: 4,
                  outline: "none", background: "#fff", color: "#111",
                  boxSizing: "border-box", fontFamily: "inherit",
                  transition: "box-shadow 0.2s",
                  boxShadow: "0 2px 20px rgba(0,0,0,0.04)"
                }}
                onFocus={e => e.target.style.boxShadow = "0 4px 30px rgba(0,0,0,0.1)"}
                onBlur={e => e.target.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)"}
              />
              <button
                type="submit"
                disabled={!query.trim()}
                style={{
                  position: "absolute", right: 0, top: 0, bottom: 0,
                  background: "#111", color: "#fff", border: "none",
                  padding: "0 24px", fontSize: 11, letterSpacing: "0.15em",
                  textTransform: "uppercase", cursor: "pointer",
                  borderRadius: "0 3px 3px 0", fontFamily: "inherit",
                  opacity: query.trim() ? 1 : 0.4, transition: "opacity 0.2s"
                }}
              >Search</button>
            </form>

            {/* Quick-search pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {["Best sellers", "Blanche perfume", "Byredo stores in India", "Candles", "Gift ideas"].map(q => (
                <button
                  key={q}
                  onClick={() => handleSubmit(undefined, q)}
                  style={{
                    padding: "8px 16px", fontSize: 12, border: "1px solid #ddd",
                    borderRadius: 100, background: "#fff", cursor: "pointer",
                    color: "#555", fontFamily: "inherit", transition: "all 0.2s",
                    letterSpacing: "0.02em"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; e.currentTarget.style.background = "#f5f5f3"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "#fff"; }}
                >{q}</button>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ─── CHAT / RESULTS ─── */}
      {isSearchActive && (
        <div style={{ flex: 1, paddingTop: 88, paddingBottom: 100, background: "#fafaf8" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            {messages.map((msg, i) => (
              <div key={i} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.05}s`, marginBottom: 40 }}>

                {/* User bubble */}
                {msg.role === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
                    <div style={{
                      background: "#111", color: "#fff",
                      padding: "12px 20px", borderRadius: "20px 20px 4px 20px",
                      fontSize: 14, lineHeight: 1.6, maxWidth: "68%",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.12)"
                    }}>{msg.content}</div>
                  </div>
                )}

                {/* AI response */}
                {msg.role === "ai" && (
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "#111", color: "#fff", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, letterSpacing: "0.05em", fontWeight: 600,
                      marginTop: 2
                    }}>B</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Answer text */}
                      {msg.content && (
                        <div style={{
                          background: "#fff", borderRadius: 12,
                          padding: "18px 22px", marginBottom: 20,
                          border: "1px solid #ebebeb",
                          boxShadow: "0 1px 8px rgba(0,0,0,0.04)"
                        }}>
                          {renderAnswer(msg.content)}
                        </div>
                      )}

                      {/* Product cards */}
                      {msg.products && msg.products.length > 0 && (
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: 16, marginBottom: 24
                        }}>
                          {msg.products.slice(0, 6).map((p: any, j: number) => (
                            <a
                              key={j}
                              href={p.url || "https://www.byredo.com"}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "flex", flexDirection: "column",
                                background: "#fff", borderRadius: 10,
                                border: "1px solid #ebebeb", overflow: "hidden",
                                textDecoration: "none", color: "inherit",
                                transition: "all 0.25s",
                                boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
                              }}
                              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = "#ccc"; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#ebebeb"; }}
                            >
                              {/* Image */}
                              <div style={{ background: "#f7f7f5", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
                                {p.image ? (
                                  <img src={p.image} alt={p.name} referrerPolicy="no-referrer" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
                                ) : (
                                  <span style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>No image</span>
                                )}
                              </div>
                              {/* Info */}
                              <div style={{ padding: "12px 14px 14px" }}>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: 4 }}>
                                  {(p.category || "Byredo").toString().replace("KLEVU_PRODUCT", "").split(";;")[0].trim() || "Collection"}
                                </p>
                                <p style={{ fontSize: 13, color: "#111", fontWeight: 500, marginBottom: 6, lineHeight: 1.35 }}>
                                  {p.name?.length > 32 ? p.name.slice(0, 30) + "…" : p.name}
                                </p>
                                <p style={{ fontSize: 12, color: "#555" }}>{p.price || "—"}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Follow-up suggestions */}
                      {msg.follow_up && msg.follow_up.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#aaa", marginBottom: 10, fontWeight: 600 }}>
                            Suggestions
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {msg.follow_up.map((q, j) => (
                              <button
                                key={j}
                                onClick={() => i === messages.length - 1 && handleSubmit(undefined, q)}
                                disabled={i !== messages.length - 1}
                                style={{
                                  padding: "8px 16px", fontSize: 12,
                                  border: "1px solid #ddd", borderRadius: 100,
                                  background: "#fff", color: "#333",
                                  cursor: i === messages.length - 1 ? "pointer" : "default",
                                  opacity: i === messages.length - 1 ? 1 : 0.45,
                                  fontFamily: "inherit", transition: "all 0.2s",
                                  letterSpacing: "0.02em"
                                }}
                                onMouseEnter={e => { if (i === messages.length - 1) { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.background = "#f5f5f3"; e.currentTarget.style.color = "#111"; } }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#333"; }}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="animate-fadeIn" style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 40 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "#111", color: "#fff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600
                }}>B</div>
                <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #ebebeb" }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 14 }}>
                    {[0, 1, 2].map(k => (
                      <div key={k} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#bbb",
                        animation: "pulse 1.4s infinite", animationDelay: `${k * 0.2}s`
                      }} />
                    ))}
                    <span style={{ fontSize: 10, color: "#bbb", letterSpacing: "0.15em", textTransform: "uppercase", marginLeft: 8 }}>
                      Composing response…
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[100, 85, 65].map((w, k) => (
                      <div key={k} className="shimmer-bg" style={{ height: 11, borderRadius: 6, width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* ─── FIXED BOTTOM INPUT (chat mode) ─── */}
      {isSearchActive && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(250,250,248,0.95)", backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #ebebeb",
          padding: "14px 24px 20px", zIndex: 200
        }}>
          <form onSubmit={handleSubmit} style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
            {/* Quick categories */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {categories.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSubmit(undefined, `Show me ${c} products`)}
                  style={{
                    padding: "6px 12px", fontSize: 10, border: "1px solid #ddd",
                    borderRadius: 100, background: "#fff", color: "#666",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                    letterSpacing: "0.08em", textTransform: "uppercase"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#111"; e.currentTarget.style.color = "#111"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#666"; }}
                >{c}</button>
              ))}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask about Byredo..."
              style={{
                flex: 1, padding: "13px 18px", fontSize: 14,
                border: "1.5px solid #222", borderRadius: 4,
                outline: "none", fontFamily: "inherit", background: "#fff",
                transition: "box-shadow 0.2s"
              }}
              onFocus={e => e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)"}
              onBlur={e => e.target.style.boxShadow = "none"}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                background: "#111", color: "#fff", border: "none",
                borderRadius: 4, padding: "13px 24px",
                fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
                cursor: "pointer", fontFamily: "inherit",
                opacity: (loading || !query.trim()) ? 0.4 : 1, transition: "opacity 0.2s",
                flexShrink: 0
              }}
            >Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
