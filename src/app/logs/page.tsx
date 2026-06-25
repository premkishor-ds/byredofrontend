"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface LogEntry {
  id: number;
  timestamp: string;
  query: string;
  answer: string;
  ip_address?: string;
  products?: any[];
}

export default function LogsPage() {
  const router = useRouter();
  const [rawHistory, setRawHistory] = useState<LogEntry[]>([]);
  const [filterDate, setFilterDate] = useState<string>("");
  
  const [apiBase, setApiBase] = useState("http://localhost:8000");
  const [loading, setLoading] = useState(true);

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return 0;
    // If it's DD/MM/YYYY format
    if (dateStr.includes("/")) {
      const [datePart, timePart] = dateStr.split(", ");
      const [d, m, y] = datePart.split("/");
      // Convert to YYYY-MM-DD for reliable parsing
      return new Date(`${y}-${m}-${d} ${timePart || ""}`).getTime();
    }
    // If it's YYYY-MM-DD format
    return new Date(dateStr).getTime();
  };

  const fetchLogs = async (baseUrl: string) => {
    try {
      setLoading(true);
      
      const res = await fetch(`${baseUrl}/api/logs`);
      const dbLogs = await res.json();
      
      const saved = localStorage.getItem("byredo_full_history");
      const localLogs = saved ? JSON.parse(saved) : [];
      
      const mergedMap = new Map();
      localLogs.forEach((l: any) => {
        const key = `${l.query.trim().toLowerCase()}_${l.timestamp}`;
        mergedMap.set(key, l);
      });
      
      dbLogs.forEach((l: any) => {
        const key = `${l.query.trim().toLowerCase()}_${l.timestamp}`;
        mergedMap.set(key, l);
      });
      
      const merged = Array.from(mergedMap.values())
        .sort((a, b) => normalizeDate(b.timestamp) - normalizeDate(a.timestamp));
        
      setRawHistory(merged);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let currentBase = "http://localhost:8000";
    if (typeof window !== "undefined") {
      currentBase = `http://${window.location.hostname}:8000`;
      setApiBase(currentBase);
    }
    fetchLogs(currentBase);
  }, []);

  const clearLogs = () => {
    if (confirm("Are you sure you want to clear all search logs?")) {
      localStorage.removeItem("byredo_full_history");
      setRawHistory([]);
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    let cleanText = text.replace(/!\[.*?\]\(.*?\)/g, "");
    const lines = cleanText.split("\n");
    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} style={{ height: 12 }} />;
      
      const isListItem = trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ");
      const contentToProcess = isListItem ? trimmedLine.substring(2) : line;

      const boldRegex = /\*\*(.*?)\*\*/g;
      let rawParts = contentToProcess.split(/(\[.*?\]\(.*?\))/g);
      
      const finalContent = rawParts.map((part, idx) => {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          const [_, label, url] = linkMatch;
          return (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" 
               style={{ color: "#000", textDecoration: "underline", fontWeight: 500, borderBottom: "1px solid #000" }}>
              {label}
            </a>
          );
        }
        const segments = part.split(boldRegex);
        return segments.map((seg, sIdx) => 
          sIdx % 2 === 1 ? <strong key={sIdx} style={{ fontWeight: 600, color: "#000" }}>{seg}</strong> : seg
        );
      });

      if (isListItem) {
        return (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, paddingLeft: 12 }}>
            <span style={{ color: "#000", fontWeight: 700 }}>•</span>
            <span style={{ fontSize: 16, lineHeight: 1.8, color: "#000" }}>{finalContent}</span>
          </div>
        );
      }
      return <p key={i} style={{ fontSize: 16, lineHeight: 1.9, marginBottom: 18, color: "#000", fontWeight: 400 }}>{finalContent}</p>;
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const displayHistory = useMemo(() => {
    let base = [...rawHistory];
    if (filterDate) {
      base = base.filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        return itemDate === filterDate;
      });
    }

    // Aggregation Logic: Group by query and count frequency
    const uniqueMap = new Map<string, { count: number; latestDate: string; timestamp: string; id: number; query: string; ip_address?: string }>();
    
    // Sort raw by timestamp first to ensure latest is handled properly
    const sortedRaw = [...base].sort((a, b) => normalizeDate(b.timestamp) - normalizeDate(a.timestamp));

    sortedRaw.forEach(item => {
      const q = item.query.trim().toLowerCase();
      if (uniqueMap.has(q)) {
        const existing = uniqueMap.get(q)!;
        uniqueMap.set(q, { 
          ...existing, 
          count: existing.count + 1,
          ip_address: item.ip_address || existing.ip_address || "Legacy Log"
        });
      } else {
        uniqueMap.set(q, { 
          count: 1, 
          latestDate: item.timestamp, 
          timestamp: item.timestamp, 
          id: item.id, 
          query: item.query,
          ip_address: item.ip_address || "Legacy Log"
        });
      }
    });

    return Array.from(uniqueMap.values())
      .sort((a, b) => normalizeDate(b.timestamp) - normalizeDate(a.timestamp));
  }, [rawHistory, filterDate]);

  const totalPages = Math.ceil(displayHistory.length / itemsPerPage);
  const paginatedHistory = displayHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", fontFamily: "inherit" }}>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "#fff", borderBottom: "1px solid #efefef",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 84,
      }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="133" height="28" viewBox="0 0 382 80" fill="none">
            <path fill="#111" d="M.502 0h13.364v66.665L.502 79.998zM27.23 66.665c7.488 0 13.497-6 13.497-13.333C40.727 46 34.712 40 27.23 40V26.666c3.741 0 6.682-2.934 6.682-6.661 0-3.733-2.94-6.667-6.682-6.667V0c11.09 0 20.05 8.93 20.05 20 0 4.531-1.472-8.663-4.007 11.996 6.415 4.803 10.69 12.668 10.69 21.331 0 14.67-11.891 26.666-26.728 26.666V66.665zM60.666 26.666V0H74.03v26.661h13.364L74.03 39.999zM87.389 40l13.364-13.333V0h13.364v26.661l-13.364 13.333V66.66L87.389 79.993zM127.512 0h13.364v66.665l-13.364 13.333zm26.722 40c7.355 0 13.364-6.002 13.364-13.334s-6.014-13.333-13.364-13.333V0c14.704 0 26.728 11.997 26.728 26.661 0 14.67-12.024 26.666-26.728 26.666zm13.369 13.332 13.364 13.333v13.333h-13.364zM194.355 0h13.364v66.665l-13.364 13.333zm26.723 0h26.728v13.333h-26.728zm0 26.666h26.728V40h-26.728zm0 40h26.728v13.332h-26.728zM261.201 0h13.364v66.665l-13.364 13.333zm26.723 66.665c7.354 0 13.364-6 13.364-13.333V26.666c0-7.332-6.015-13.333-13.364-13.333V0c14.837 0 26.728 11.997 26.728 26.661v26.666c0 14.67-11.891 26.666-26.728 26.666zM328.04 26.668c0-14.664 12.025-26.661 26.723-26.661 14.837 0 26.728 11.997 26.728 26.66l-13.364 13.334V26.668a13.303 13.303 0 0 0-13.364-13.333c-7.349 0-13.364 6-13.364 13.333L328.035 40V26.668zm0 26.666 13.364-13.333v13.333c0 7.332 6.015 13.333 13.364 13.333a13.3 13.0 0 0 13.364-13.333l13.364-13.333v13.333c0 14.67-11.891 26.666-26.728 26.666-14.698 0-26.728-11.997-26.728-26.666"></path>
          </svg>
        </button>
        <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#111", fontWeight: 600 }}>Discovery Analysis</span>
        <button onClick={() => fetchLogs(apiBase)} disabled={loading} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#111", background: "none", border: "1px solid #111", cursor: "pointer", padding: "6px 16px", borderRadius: 4, opacity: loading ? 0.5 : 1 }}>
          {loading ? "Syncing..." : "Sync Now"}
        </button>
        <button onClick={clearLogs} style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ff4444", background: "none", border: "1px solid #ff4444", cursor: "pointer", padding: "6px 16px", borderRadius: 4 }}>
          Clear Data
        </button>
      </header>

      <div style={{ marginTop: 84, padding: "24px 48px", background: "#fcfcfc", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", fontWeight: 600 }}>Filter by Date:</label>
            <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: "8px 12px", border: "1px solid #ddd", fontSize: 12, outline: "none", fontFamily: "inherit", borderRadius: 2 }} 
            />
          </div>
          {filterDate && <button onClick={() => setFilterDate("")} style={{ background: "none", border: "none", color: "#888", fontSize: 10, textTransform: "uppercase", cursor: "pointer", textDecoration: "underline" }}>Clear Filter</button>}
        </div>
        <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Unique Searches: {displayHistory.length}
        </div>
      </div>

      <main style={{ flex: 1, padding: "48px", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #111" }}>
                <th style={{ padding: "16px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#111" }}>Search Query</th>
                <th style={{ padding: "16px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#111", width: 140 }}>Origin IP</th>
                <th style={{ padding: "16px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#111", width: 100 }}>Freq</th>
                <th style={{ padding: "16px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#111", width: 200 }}>Last Searched</th>
                <th style={{ padding: "16px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#111", width: 110 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "60px 0", textAlign: "center", color: "#bbb", fontSize: 14 }}>{filterDate ? "No searches found for this date." : "No search history recorded yet."}</td></tr>
              ) : (
                paginatedHistory.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "24px 8px", fontSize: 14, color: "#111", fontWeight: 500, textTransform: "capitalize" }}>{entry.query}</td>
                    <td style={{ padding: "24px 8px", fontSize: 12, color: "#888", fontWeight: 600 }}>{entry.ip_address}</td>
                    <td style={{ padding: "24px 8px", fontSize: 14, color: "#111" }}>
                      <span style={{ background: entry.count > 1 ? "#111" : "#f5f5f5", color: entry.count > 1 ? "#fff" : "#111", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {entry.count} {entry.count === 1 ? "search" : "searches"}
                      </span>
                    </td>
                    <td style={{ padding: "24px 8px", fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>{entry.timestamp}</td>
                    <td style={{ padding: "24px 8px" }}>
                      <button onClick={() => { localStorage.setItem("byredo_pending_query", entry.query); router.push("/"); }} 
                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#111", background: "#fff", border: "1px solid #111", padding: "6px 12px", cursor: "pointer", borderRadius: 2, fontWeight: 500 }}>
                        Re-Search
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 40, alignItems: "center" }}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                style={{ background: "none", border: "1px solid #ddd", padding: "8px 16px", cursor: currentPage === 1 ? "default" : "pointer", fontSize: 11, textTransform: "uppercase", opacity: currentPage === 1 ? 0.4 : 1 }}
              >Previous</button>
              <span style={{ fontSize: 12, color: "#888" }}>Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ background: "none", border: "1px solid #ddd", padding: "8px 16px", cursor: currentPage === totalPages ? "default" : "pointer", fontSize: 11, textTransform: "uppercase", opacity: currentPage === totalPages ? 0.4 : 1 }}
              >Next</button>
            </div>
          )}
        </div>
      </main>
      <footer style={{ padding: "32px 48px", background: "#fcfcfc", borderTop: "1px solid #eee", textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.2em" }}>Byredo Discovery Logs • Unique Query Tracking V2</p>
      </footer>
    </div>
  );
}
