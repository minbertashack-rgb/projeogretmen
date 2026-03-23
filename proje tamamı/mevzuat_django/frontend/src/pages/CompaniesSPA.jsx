import { useEffect, useMemo, useState } from "react";

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CompaniesSPA() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");

      const qs = dq.trim() ? `?q=${encodeURIComponent(dq.trim())}` : "";
      try {
        const res = await fetch(`/api/companies-spa/${qs}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(data);
      } catch (e) {
        if (e.name !== "AbortError") setErr(String(e));
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [dq]);

  return (
    <div>
      <h1>Şirketler (SPA)</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ara: Şirket adı..."
      />

      {loading && <div>Yükleniyor...</div>}
      {err && <div style={{ color: "red" }}>{err}</div>}

      {/* senin tablo renderın */}
      <div>Toplam: {rows.length}</div>
      {/* rows.map(...) */}
    </div>
  );
}
