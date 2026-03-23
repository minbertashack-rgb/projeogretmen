import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCompanyDashboard, patchObligationStatus } from "../api";

export default function CompaniesDetail() {
  const { id } = useParams();

  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchCompanyDashboard(id);
      setDash(data);
    } catch (e) {
      setErr(e.message || String(e));
      setDash(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setDone(obligationId, done) {
    try {
      await patchObligationStatus(obligationId, done);
      await load(); // PATCH sonrası dashboard yenile
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  const score = dash?.score ?? dash?.uyum_skoru ?? null;
  const todo = dash?.todo_items ?? dash?.todo ?? [];
  const completed = dash?.completed_items ?? dash?.completed ?? [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/companies">← Listeye dön</Link>
        <h1 style={{ margin: 0 }}>Şirket Detay — ID: {id}</h1>
      </div>

      {loading && <p>Yükleniyor...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {dash && (
        <>
          <div style={{ marginTop: 10 }}>
            <b>Skor:</b>{" "}
            {score !== null ? (
              <span style={{ padding: "2px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
                {score}
              </span>
            ) : (
              "—"
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <h3>Yapılacaklar (TODO) — {todo.length}</h3>
              {todo.length === 0 && <p>Yapılacak yok.</p>}
              {todo.map((it) => (
                <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <b>{it.title ?? it.baslik ?? "Yükümlülük"}</b>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    Due: {it.due_date ?? it.due ?? "-"} | Risk: {trRisk(it.risk ?? it.risk_level)} | Impact: {it.impact ?? "-"}
                  </div>
                  <button style={{ marginTop: 8 }} onClick={() => setDone(it.id, true)}>
                    Tamamlandı
                  </button>
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <h3>Tamamlananlar — {completed.length}</h3>
              {completed.length === 0 && <p>Henüz yok.</p>}
              {completed.map((it) => (
                <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <b>{it.title ?? it.baslik ?? "Yükümlülük"}</b>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    Due: {it.due_date ?? it.due ?? "-"} | Risk: {it.risk ?? "-"} | Impact: {it.impact ?? "-"}
                  </div>
                  <button style={{ marginTop: 8 }} onClick={() => setDone(it.id, false)}>
                    Geri al
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
