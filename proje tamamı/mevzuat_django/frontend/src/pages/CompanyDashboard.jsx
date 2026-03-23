import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function safeFetchJson(url, options = {}) {
  const mergedHeaders = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  const r = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  const text = await r.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `JSON gelmedi (HTML gelmiş olabilir).\nURL: ${url}\nİlk 120 karakter:\n${text.slice(
        0,
        120
      )}`
    );
  }

  if (!r.ok) {
    throw new Error(
      `HTTP ${r.status} ${r.statusText}\nURL: ${url}\nResponse: ${text.slice(
        0,
        200
      )}`
    );
  }
  return data;
}

export default function CompanyDashboard() {
  const { id } = useParams();
  const nav = useNavigate();

  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  // ✅ Dashboard JSON endpoint
  const DASH_URL = `${API_BASE}/api/companies-spa/${id}/dashboard/`;

  // ✅ Tamamlandı / Geri al -> PATCH atan fonksiyon
  async function setObligationStatus(obligationId, is_compliant) {
    setBusyId(obligationId);
    setErr("");
    try {
      const url = `${API_BASE}/api/obligations/${obligationId}/status/`;

      const payload = await safeFetchJson(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ is_compliant }),
        // Eğer Django session/CSRF ile gidiyorsan burayı aç:
        // credentials: "include",
      });

      setDash(payload);
    } catch (e) {
      // PATCH tarafında abort beklemiyoruz ama olsun:
      if (e?.name === "AbortError") return;
      setErr(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();

    setLoading(true);
    setErr("");

    safeFetchJson(DASH_URL, { signal: ctrl.signal })
      .then((data) => {
        if (!ctrl.signal.aborted) setDash(data);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return; // ✅ canceled normal
        setErr(e?.message || String(e));
        setDash(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort(); // ✅ id değişince/unmount olunca eskisini iptal et
  }, [DASH_URL]);

  const score =
    dash?.uyum_skoru ??
    dash?.compliance_score ??
    dash?.score ??
    dash?.dash?.uyum_skoru ??
    null;

  const stats = dash?.stats ?? dash?.dash?.stats ?? {};
  const todo = dash?.todo ?? dash?.dash?.todo ?? [];
  const completed = dash?.completed ?? dash?.dash?.completed ?? [];

  function obId(ob) {
    return ob?.id ?? ob?.obligation_id ?? ob?.pk ?? ob?.obligation ?? null;
  }

  function obTitle(ob) {
    return (
      ob?.title ||
      ob?.name ||
      ob?.duzenleme_title ||
      ob?.duzenleme ||
      ob?.baslik ||
      "Yükümlülük"
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 16,
        fontFamily: "Arial",
      }}
    >
      <button
        onClick={() => nav("/companies")}
        style={{ marginBottom: 10, cursor: "pointer" }}
      >
        ← Listeye dön
      </button>

      <h2 style={{ marginBottom: 8 }}>Şirket Dashboard (ID: {id})</h2>

      {err ? (
        <pre
          style={{
            background: "#ffecec",
            border: "1px solid #ffb3b3",
            padding: 12,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </pre>
      ) : null}

      {loading ? <div>Yükleniyor...</div> : null}

      {!loading && dash ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "white",
                minWidth: 220,
              }}
            >
              <div style={{ color: "#666", fontSize: 12 }}>Uyum Skoru</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {typeof score === "number" ? `${score}/100` : "-"}
              </div>
            </div>

            <div
              style={{
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "white",
                flex: 1,
                minWidth: 260,
              }}
            >
              <div style={{ color: "#666", fontSize: 12, marginBottom: 6 }}>
                İstatistikler
              </div>
              {Object.keys(stats || {}).length === 0 ? (
                <div style={{ color: "#777" }}>stats boş.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {Object.entries(stats).map(([k, v]) => (
                    <li key={k}>
                      <b>{k}</b>: {String(v)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* TODO */}
            <div style={{ border: "1px solid #ddd", borderRadius: 10, background: "white" }}>
              <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 800 }}>
                Yapılacaklar (TODO) — {todo.length}
              </div>
              <div style={{ padding: 12 }}>
                {todo.length === 0 ? (
                  <div style={{ color: "#777" }}>TODO yok.</div>
                ) : (
                  todo.map((ob, idx) => {
                    const oid = obId(ob) ?? `row-${idx}`;
                    return (
                      <div
                        key={oid}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "10px 0",
                          borderTop: idx ? "1px solid #f2f2f2" : "none",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{obTitle(ob)}</div>
                          <div style={{ color: "#777", fontSize: 12 }}>
                            Obligation ID: {String(obId(ob) ?? "-")}
                          </div>
                        </div>
                        <button
                          disabled={!obId(ob) || busyId === obId(ob)}
                          onClick={() => setObligationStatus(obId(ob), true)}
                          style={{ padding: "8px 10px", cursor: "pointer" }}
                        >
                          {busyId === obId(ob) ? "..." : "Tamamlandı"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COMPLETED */}
            <div style={{ border: "1px solid #ddd", borderRadius: 10, background: "white" }}>
              <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 800 }}>
                Tamamlananlar — {completed.length}
              </div>
              <div style={{ padding: 12 }}>
                {completed.length === 0 ? (
                  <div style={{ color: "#777" }}>Tamamlanan yok.</div>
                ) : (
                  completed.map((ob, idx) => {
                    const oid = obId(ob) ?? `done-${idx}`;
                    return (
                      <div
                        key={oid}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "10px 0",
                          borderTop: idx ? "1px solid #f2f2f2" : "none",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{obTitle(ob)}</div>
                          <div style={{ color: "#777", fontSize: 12 }}>
                            Obligation ID: {String(obId(ob) ?? "-")}
                          </div>
                        </div>
                        <button
                          disabled={!obId(ob) || busyId === obId(ob)}
                          onClick={() => setObligationStatus(obId(ob), false)}
                          style={{ padding: "8px 10px", cursor: "pointer" }}
                        >
                          {busyId === obId(ob) ? "..." : "Geri al"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
            Debug: Dashboard URL = <b>{DASH_URL}</b>
          </div>
        </>
      ) : null}
    </div>
  );
}
