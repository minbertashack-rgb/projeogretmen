import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCompanies } from "../api";

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

export default function CompaniesList() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();

  const q = sp.get("q") ?? "";
  const sector = sp.get("sector") ?? "all";
  const risky = sp.get("risky") === "1";
  const threshold = toInt(sp.get("threshold"), 80);
  const sort = sp.get("sort") ?? "name";
  const dir = sp.get("dir") ?? "asc";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]);

  const sectorOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      { value: "yazilim", label: "Yazılım" },
      { value: "imalat", label: "İmalat" },
      { value: "perakende", label: "Perakende" },
      { value: "lojistik", label: "Lojistik" },
    ],
    []
  );

  // riskli satır kontrolü (kalın yazı için)
  const isRisk = (c) => {
    const score = Number(c?.compliance_score ?? 999);
    const overdue = Number(c?.overdue_obligations ?? 0);
    return (Number.isFinite(score) && score < threshold) || overdue > 0;
  };

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");

    fetchCompanies({ q, sector, risky, threshold, sort, dir, signal: ac.signal })
      .then(setRows)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setErr(String(e?.message ?? e));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [q, sector, risky, threshold, sort, dir]);

  function patchParams(next) {
    const n = new URLSearchParams(sp);
    Object.entries(next).forEach(([k, v]) => {
      if (v === null || v === "" || v === undefined) n.delete(k);
      else n.set(k, String(v));
    });
    setSp(n, { replace: true });
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Şirketler</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={q}
          placeholder="Ara (q): ad / sektör / şehir"
          onChange={(e) => patchParams({ q: e.target.value })}
        />

        <select value={sector} onChange={(e) => patchParams({ sector: e.target.value })}>
          {sectorOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={risky}
            onChange={(e) => patchParams({ risky: e.target.checked ? "1" : null })}
          />
          Sadece riskli (skor &lt; threshold veya gecikmiş &gt; 0)
        </label>

        <input
          style={{ width: 70 }}
          value={threshold}
          onChange={(e) => patchParams({ threshold: e.target.value })}
        />

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          Sırala:
          <select value={sort} onChange={(e) => patchParams({ sort: e.target.value })}>
            <option value="name">Şirket adı</option>
            <option value="compliance_score">Uyum skoru</option>
            <option value="open_obligations">Açık</option>
            <option value="overdue_obligations">Gecikmiş</option>
          </select>
        </label>

        <button onClick={() => patchParams({ dir: dir === "asc" ? "desc" : "asc" })}>
          Yön: {dir === "asc" ? "Artan ↑" : "Azalan ↓"}
        </button>

        <button
          onClick={() =>
            patchParams({
              q: "",
              sector: "all",
              risky: null,
              threshold: 80,
              sort: "name",
              dir: "asc",
            })
          }
        >
          Temizle
        </button>
      </div>

      {err && <div style={{ marginTop: 10, color: "crimson" }}>Hata: {err}</div>}
      {loading && <div style={{ marginTop: 10 }}>Yükleniyor…</div>}

      {!loading && !err && (
        <table style={{ marginTop: 16, borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">Şirket</th>
              <th align="left">Sektör</th>
              <th align="left">Şehir</th>
              <th align="left">Skor</th>
              <th align="left">Açık</th>
              <th align="left">Gecikmiş</th>
              <th align="left">İşlem</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ paddingTop: 12 }}>
                  Kayıt yok
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const risk = isRisk(c);

                return (
                  <tr
                    key={c.id}
                    style={{
                      cursor: "pointer",
                      fontWeight: risk ? 700 : 400,
                      opacity: risk ? 1 : 0.95,
                    }}
                    onClick={() => nav(`/companies/${c.id}`)}
                  >
                    <td>{c.name}</td>
                    <td>{c.sector}</td>
                    <td>{c.location_city}</td>
                    <td>{c.compliance_score ?? "-"}</td>
                    <td>{c.open_obligations ?? "-"}</td>
                    <td>{c.overdue_obligations ?? "-"}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          const base =
                            import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
                          const url = new URL(`/api/companies/${c.id}/dashboard-page/`, base);

                          window.open(url.toString(), "_blank", "noopener,noreferrer");
                        }}
                      >
                        HTML Paneli
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
